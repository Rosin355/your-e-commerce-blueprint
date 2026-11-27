import hashlib
import hmac
import runpy
import unittest
from pathlib import Path

reconcile = runpy.run_path(str(Path(__file__).parents[1]/'history/reconcile-local.py'))['reconcile']


class ReconcileTests(unittest.TestCase):
    def test_identity_and_minimization(self):
        key = b'test'
        email = 'demo@example.invalid'
        token = hmac.new(key, email.encode(), hashlib.sha256).hexdigest()
        gid = 'gid://shopify/Customer/1'
        row = {'ID':'1','orders':'2','user_email':email.upper(),'roles':'customer',
               'session_tokens':'fixture','user_pass':'fixture'}
        data = reconcile([row], [(gid,token)], key)['woocommerce'][0]
        self.assertEqual(data, dict(woo_id='1', acquisti_woo=2, stato='email_da_verificare',
                                     candidato_shopify=gid, shopify_verificato=None, duplicato=False))
        rows = reconcile([row, {**row, 'ID':'2'}, {**row, 'ID':'3','roles':'administrator'}],
                         [(gid,token)], key)['woocommerce']
        self.assertEqual([r['stato'] for r in rows], ['duplicato','duplicato','escluso'])
        self.assertTrue(all(r['candidato_shopify'] is None for r in rows))

    def test_duplicate_snapshot_rejected(self):
        with self.assertRaises(ValueError):
            reconcile([], [('gid://shopify/Customer/1','')]*2, b'test')


if __name__ == '__main__':
    unittest.main()
