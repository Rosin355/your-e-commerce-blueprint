"""Import Woo offline + transazione psql esplicita. Richiede un servizio libpq privato."""
import argparse
import csv
import io
import os
import subprocess
import sys

REQUIRED = {'ID', 'first_name', 'last_name', 'user_email', 'orders', 'roles'}


def project(stream):
    csv.field_size_limit(32 * 1024 * 1024)
    reader = csv.DictReader(stream)
    headers = reader.fieldnames or []
    if not REQUIRED.issubset(headers) or len(headers) != len(set(headers)):
        raise ValueError('Intestazione non valida')
    seen = set()
    data = []
    for row in reader:
        if None in row or None in row.values() or not row['roles'].strip():
            raise ValueError('Riga incompleta')
        wid = int(row['ID'])
        if not 0 < wid <= 9007199254740991 or wid in seen:
            raise ValueError('ID non valido o duplicato')
        seen.add(wid)
        if row['roles'] != 'customer':
            continue
        count = int(row['orders'])
        if not 0 <= count <= 2147483647 or any('\x00' in row[k] for k in ('first_name','last_name','user_email')):
            raise ValueError('Dato storico non valido')
        data.append((wid, row['first_name'], row['last_name'], row['user_email'], count))
    return data, len(seen)


def copy_value(value):
    return str(value).replace('\\', '\\\\').replace('\t', '\\t').replace('\r', '\\r').replace('\n', '\\n')


def transaction(rows):
    buf = io.StringIO()
    buf.write("""begin;
select pg_advisory_xact_lock(527112026);
create temp table incoming (like woo_archive.customers including constraints) on commit drop;
copy incoming (woo_id,first_name,last_name,email,purchases) from stdin;
""")
    for row in rows:
        buf.write('\t'.join(map(copy_value,row)) + '\n')
    buf.write(r"""\.
do $import$
declare added integer;
begin
  if exists (select from woo_archive.customers c left join incoming i using(woo_id)
             where i.woo_id is null or (c.first_name,c.last_name,c.email,c.purchases)
             is distinct from (i.first_name,i.last_name,i.email,i.purchases)) then
    raise exception 'Snapshot divergente: revisione necessaria';
  end if;
  insert into woo_archive.customers select * from incoming on conflict (woo_id) do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    insert into woo_archive.audit(actor,action,quantity) values(session_user,'import',added);
  end if;
end $import$;
commit;
""")
    return buf.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--expected-accounts', type=int, default=5453)
    parser.add_argument('--expected-customers', type=int, default=5450)
    parser.add_argument('--expected-purchases', type=int, default=952)
    args = parser.parse_args()
    with open(args.source, encoding='utf-8-sig', newline='') as stream:
        rows, accounts = project(stream)
    count = sum(r[-1] for r in rows)
    if (accounts,len(rows),count) != (args.expected_accounts,args.expected_customers,args.expected_purchases):
        raise ValueError('Censimento divergente')
    if args.apply:
        if not os.environ.get('PGSERVICE'):
            raise ValueError('Servizio libpq privato richiesto')
        env = {**os.environ, 'PGSSLMODE':'verify-full', 'PGCLIENTENCODING':'UTF8'}
        result = subprocess.run(['psql','-X','-q','-v','ON_ERROR_STOP=1'],
                                input=transaction(rows).encode(),env=env,
                                stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if result.returncode:
            raise ValueError('Transazione non confermata. Verificare il registro e ripetere lo snapshot.')
    print(f'Account {accounts}, clienti {len(rows)}, acquisti {count}, modalità {"applica" if args.apply else "verifica"}')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, csv.Error, OverflowError):
        sys.exit('Verifica o import falliti. Nessun dettaglio personale nei log.')
