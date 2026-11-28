import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function ProductHeading({ title }: { title: string }) {
  return (
    <>
      <p className='text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark'>Online Garden</p>
      <h1 className='mt-2 text-[2rem] font-heading font-semibold leading-[1.1] text-foreground md:text-[2.25rem]'>
        {title}
      </h1>
    </>
  );
}

export function ProductFaq({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <Accordion type='multiple' className='w-full'>
      {items.map((item, idx) => (
        <AccordionItem key={`faq-${idx}`} value={`faq-${idx}`}>
          <AccordionTrigger className='py-5 text-left text-[15px] font-semibold text-foreground hover:no-underline md:text-base'>
            {item.question}
          </AccordionTrigger>
          <AccordionContent className='pb-6 text-[15px] leading-7 text-muted-foreground'>
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function ProductDescription({ paragraphs, children }: { paragraphs: string[]; children?: React.ReactNode }) {
  return (
    <>
      {paragraphs.length > 0 && (
        <section id='descrizione-estesa' aria-labelledby='titolo-descrizione' className='mt-8 scroll-mt-28 space-y-3'>
          <h2 id='titolo-descrizione' className='font-heading text-xl font-semibold'>Descrizione estesa</h2>
          {children ?? paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </section>
      )}
    </>
  );
}

export function ProductIntro({ intro, paragraphs }: { intro?: string; paragraphs: string[] }) {
  const distinctIntro = intro && intro.replace(/\s+/g, ' ') !== paragraphs.join(' ').replace(/\s+/g, ' ');
  return (
    <>
      {distinctIntro && (
        <p aria-label='Descrizione breve' className='mt-4 whitespace-pre-line text-[15px] leading-7'>{intro}</p>
      )}
    </>
  );
}

export function ProductHighlights({ items }: { items: string[] }) {
  return (
    <ul className='space-y-3 text-[15px] leading-7 text-muted-foreground'>
      {items.map((item, i) => (
        <li key={i} className='flex items-start gap-3'>
          <span className='mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground' />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
export function ProductCuriosity({ items }: { items: string[] }) {
  return (
    <div className='border-l-2 border-primary/40 bg-muted/30 py-4 pl-5 pr-4'>
      <p className='text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
        Lo sapevi che
      </p>
      <div className='mt-2 space-y-3 text-[15px] leading-7 text-foreground/85'>
        {items.map((paragraph, idx) => <p key={idx}>{paragraph}</p>)}
      </div>
    </div>
  );
}
