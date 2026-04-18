-- AktoFlow: početna šema, indeksi, RLS i storage za dokumente.
-- Pokrenuti u Supabase SQL Editor ili preko: supabase db push

-- -----------------------------------------------------------------------------
-- Tipovi
-- -----------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('solo', 'team_member', 'admin');

CREATE TYPE public.firm_plan AS ENUM ('solo', 'team', 'agency');

CREATE TYPE public.business_type AS ENUM ('doo', 'sp', 'other');

CREATE TYPE public.service_type AS ENUM ('pdv', 'porez', 'godisnji', 'ostalo');

CREATE TYPE public.client_status AS ENUM ('active', 'inactive');

CREATE TYPE public.document_status AS ENUM ('received', 'missing');

CREATE TYPE public.deadline_type AS ENUM ('pdv', 'porez', 'godisnji', 'custom');

CREATE TYPE public.deadline_status AS ENUM ('pending', 'overdue', 'completed');

CREATE TYPE public.requirement_added_by AS ENUM ('user', 'system');

CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'deadline', 'system');

-- -----------------------------------------------------------------------------
-- Tabele (redosled zbog FK)
-- -----------------------------------------------------------------------------

CREATE TABLE public.firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan public.firm_plan NOT NULL DEFAULT 'solo',
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.firms IS 'Firma (tenant); owner_id = auth.uid() pri prvom INSERT-u omogućava RLS SELECT pre kreiranja public.users reda.';

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'solo',
  firm_id uuid NOT NULL REFERENCES public.firms (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lower CHECK (email = lower(email))
);

CREATE UNIQUE INDEX users_one_row_per_auth_user ON public.users (id);

COMMENT ON TABLE public.users IS 'Profil aplikacije vezan za auth.users; višekorisnički pristup preko firm_id.';

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms (id) ON DELETE CASCADE,
  name text NOT NULL,
  pib text,
  address text,
  contact_email text,
  contact_phone text,
  business_type public.business_type NOT NULL DEFAULT 'other',
  services public.service_type[] NOT NULL DEFAULT '{}',
  status public.client_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_system boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.document_types IS 'Katalog tipova dokumenata; sistemski redovi se puni migracijom/seedom.';

CREATE TABLE public.client_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES public.document_types (id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  added_by public.requirement_added_by NOT NULL DEFAULT 'user',
  notes text,
  CONSTRAINT client_document_requirements_unique UNIQUE (client_id, document_type_id)
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES public.document_types (id) ON DELETE RESTRICT,
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  period text NOT NULL,
  status public.document_status NOT NULL DEFAULT 'received'
);

CREATE INDEX documents_client_type_period ON public.documents (client_id, document_type_id, period);

CREATE TABLE public.deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date NOT NULL,
  type public.deadline_type NOT NULL,
  status public.deadline_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES public.users (id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX deadlines_client_id ON public.deadlines (client_id);
CREATE INDEX deadlines_due_date ON public.deadlines (due_date);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  message text NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id ON public.notifications (user_id);

-- -----------------------------------------------------------------------------
-- Indeksi za česte upite
-- -----------------------------------------------------------------------------

CREATE INDEX users_firm_id ON public.users (firm_id);
CREATE INDEX clients_firm_id ON public.clients (firm_id);
CREATE INDEX clients_firm_status ON public.clients (firm_id, status);

-- -----------------------------------------------------------------------------
-- Pomoćna funkcija: firm_id trenutnog korisnika (za RLS)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.firm_id
  FROM public.users AS u
  WHERE u.id = auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_firm_id() IS 'Vraća firm_id za auth.uid(); SECURITY DEFINER samo čita svoj red.';

REVOKE ALL ON FUNCTION public.current_user_firm_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_firm_id() TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- firms: članovi vide firmu; vlasnik (pre public.users) vidi po owner_id
CREATE POLICY firms_select_member_or_owner
  ON public.firms
  FOR SELECT
  TO authenticated
  USING (
    id = public.current_user_firm_id()
    OR owner_id = auth.uid()
  );

CREATE POLICY firms_update_member_or_owner
  ON public.firms
  FOR UPDATE
  TO authenticated
  USING (
    id = public.current_user_firm_id()
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    id = public.current_user_firm_id()
    OR owner_id = auth.uid()
  );

-- Nova firma: vlasnik mora biti auth.uid(), još nema public.users profil
CREATE POLICY firms_insert_owner_onboarding
  ON public.firms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.users AS u WHERE u.id = auth.uid())
  );

-- users: članovi iste firme
CREATE POLICY users_select_same_firm
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    firm_id = public.current_user_firm_id()
    OR id = auth.uid()
  );

CREATE POLICY users_insert_own_profile
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.firms AS f
      WHERE f.id = firm_id
        AND f.owner_id = auth.uid()
    )
  );

CREATE POLICY users_update_self
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND firm_id = public.current_user_firm_id())
  WITH CHECK (id = auth.uid() AND firm_id = public.current_user_firm_id());

-- clients: svi pristup samo svojoj firmi
CREATE POLICY clients_all_firm
  ON public.clients
  FOR ALL
  TO authenticated
  USING (firm_id = public.current_user_firm_id())
  WITH CHECK (firm_id = public.current_user_firm_id());

-- document_types: globalni katalog — čitanje za ulogovane
CREATE POLICY document_types_select_authenticated
  ON public.document_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Zahtjevi po klijentu — firma preko clients
CREATE POLICY client_document_requirements_select_firm
  ON public.client_document_requirements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = client_document_requirements.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

CREATE POLICY client_document_requirements_insert_firm
  ON public.client_document_requirements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = client_document_requirements.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

CREATE POLICY client_document_requirements_update_firm
  ON public.client_document_requirements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = client_document_requirements.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = client_document_requirements.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

CREATE POLICY client_document_requirements_delete_firm
  ON public.client_document_requirements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = client_document_requirements.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

-- documents: firma preko klijenta; insert/update uz proveru uploadera u istoj firmi
CREATE POLICY documents_select_firm
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = documents.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

CREATE POLICY documents_insert_firm
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = documents.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.users AS u
      WHERE u.id = uploaded_by
        AND u.firm_id = public.current_user_firm_id()
    )
  );

CREATE POLICY documents_update_firm
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = documents.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = documents.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

CREATE POLICY documents_delete_firm
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = documents.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

-- deadlines
CREATE POLICY deadlines_select_firm
  ON public.deadlines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = deadlines.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

CREATE POLICY deadlines_insert_firm
  ON public.deadlines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = deadlines.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
    AND (
      assigned_to IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = deadlines.assigned_to
          AND u.firm_id = public.current_user_firm_id()
      )
    )
  );

CREATE POLICY deadlines_update_firm
  ON public.deadlines
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = deadlines.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = deadlines.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
    AND (
      assigned_to IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = deadlines.assigned_to
          AND u.firm_id = public.current_user_firm_id()
      )
    )
  );

CREATE POLICY deadlines_delete_firm
  ON public.deadlines
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = deadlines.client_id
        AND c.firm_id = public.current_user_firm_id()
    )
  );

-- notifications: samo vlasnik
CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_insert_own
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Storage: bucket "documents" — putanja {firm_id}/{client_id}/{filename}
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Pomoć: prvi segment = firm_id, drugi = client_id
CREATE OR REPLACE FUNCTION public.storage_documents_firm_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(split_part(object_name, '/', 1), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.storage_documents_client_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(split_part(object_name, '/', 2), '')::uuid;
$$;

COMMENT ON FUNCTION public.storage_documents_firm_id(text) IS 'Parsira firm_id iz storage object name (prvi segment).';
COMMENT ON FUNCTION public.storage_documents_client_id(text) IS 'Parsira client_id iz storage object name (drugi segment).';

-- SELECT: čitanje fajlova svoje firme
CREATE POLICY storage_documents_select_firm
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.storage_documents_firm_id(name) = public.current_user_firm_id()
    AND EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = public.storage_documents_client_id(name)
        AND c.firm_id = public.current_user_firm_id()
    )
  );

-- INSERT: upload samo u svoju firmu i postojećeg klijenta te firme
CREATE POLICY storage_documents_insert_firm
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.storage_documents_firm_id(name) = public.current_user_firm_id()
    AND EXISTS (
      SELECT 1
      FROM public.clients AS c
      WHERE c.id = public.storage_documents_client_id(name)
        AND c.firm_id = public.current_user_firm_id()
    )
  );

-- UPDATE/DELETE: ista logika
CREATE POLICY storage_documents_update_firm
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.storage_documents_firm_id(name) = public.current_user_firm_id()
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.storage_documents_firm_id(name) = public.current_user_firm_id()
  );

CREATE POLICY storage_documents_delete_firm
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.storage_documents_firm_id(name) = public.current_user_firm_id()
  );
