-- Dozvola: korisnik može dodati nestandardni tip dokumenta (is_system = false)
CREATE POLICY document_types_insert_custom
  ON public.document_types
  FOR INSERT
  TO authenticated
  WITH CHECK (is_system = false);

-- Sistemski predlozi za smart detektor (kategorije za filter u aplikaciji)
INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Izvod sa računa', 'Bank statement', 'always', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Izvod sa računa' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Ugovor o angažmanu', 'Engagement contract', 'always', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Ugovor o angažmanu' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'PDV prijava', 'VAT return', 'pdv_extra', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'PDV prijava' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Ulazne fakture', 'Incoming invoices', 'pdv_extra', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Ulazne fakture' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Izlazne fakture', 'Outgoing invoices', 'pdv_extra', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Izlazne fakture' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Godišnji finansijski izveštaj', 'Annual financial report', 'doo_extra', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Godišnji finansijski izveštaj' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Bilans stanja', 'Balance sheet', 'doo_extra', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Bilans stanja' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Bilans uspeha', 'Income statement', 'doo_extra', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Bilans uspeha' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Knjiga prihoda i rashoda', 'Book of income and expenses', 'sp_extra', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Knjiga prihoda i rashoda' AND t.is_system = true
);

INSERT INTO public.document_types (name, name_en, category, is_system)
SELECT 'Prijava poreza na dobit', 'Corporate income tax return', 'porez_extra', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types t WHERE t.name = 'Prijava poreza na dobit' AND t.is_system = true
);
