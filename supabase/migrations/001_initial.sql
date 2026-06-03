-- ================================================================
-- SaraIA — Migración Inicial: Esquema completo con RLS
-- ================================================================

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 2. Tabla: empresas
-- ================================================================
CREATE TABLE empresas (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre     text NOT NULL,
  ruc        text NOT NULL UNIQUE,
  color      text NOT NULL DEFAULT '#2563eb',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 3. Tabla: perfiles (vinculada a auth.users)
-- ================================================================
CREATE TABLE perfiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
  rol        text NOT NULL CHECK (rol IN ('gerente', 'contador', 'supervisor', 'lectura')),
  nombre     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 4. Tabla: gastos
-- ================================================================
CREATE TABLE gastos (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha       date NOT NULL,
  descripcion text NOT NULL,
  monto       numeric(12,2) NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
  mensaje     text,
  saldo       numeric(12,2),
  estado      text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'verificado', 'conflicto', 'sin_factura')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 5. Tabla: facturas
-- ================================================================
CREATE TABLE facturas (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gasto_id          uuid NOT NULL REFERENCES gastos(id) ON DELETE CASCADE,
  image_base64      text,
  image_mime        text NOT NULL DEFAULT 'image/jpeg',
  ocr_fecha         date,
  ocr_monto         numeric(12,2),
  ocr_proveedor     text,
  ocr_ruc           text,
  ocr_tipo          text,
  ocr_numero        text,
  match_status      text NOT NULL DEFAULT 'sin_match' CHECK (match_status IN ('auto', 'conflicto', 'sin_match', 'manual')),
  match_score       numeric(4,3),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 6. Tabla: personal
-- ================================================================
CREATE TABLE personal (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  dni           text NOT NULL,
  nombres       text NOT NULL,
  apellidos     text NOT NULL,
  celular       text,
  correo        text,
  cargo         text,
  tipo_contrato text NOT NULL DEFAULT 'planilla' CHECK (tipo_contrato IN ('planilla', 'recibo_honorarios', 'CAS', 'practicante', 'otro')),
  estado        text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'vacaciones', 'licencia')),
  banco1        text,
  cuenta1       text,
  tipo_cuenta1  text CHECK (tipo_cuenta1 IN ('ahorro', 'corriente', 'CTS', 'interbancario')),
  banco2        text,
  cuenta2       text,
  tipo_cuenta2  text CHECK (tipo_cuenta2 IN ('ahorro', 'corriente', 'CTS', 'interbancario')),
  sueldo_base   numeric(10,2),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, dni)
);

-- ================================================================
-- 7. Tabla: asistencias (con columnas GENERATED para horas)
-- ================================================================
CREATE TABLE asistencias (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  personal_id     uuid NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
  empresa_id      uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha           date NOT NULL,
  hora_entrada    time,
  hora_salida     time,
  horas_normales  numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN hora_entrada IS NOT NULL AND hora_salida IS NOT NULL
        THEN LEAST(EXTRACT(EPOCH FROM (hora_salida - hora_entrada)) / 3600, 8)
      ELSE 0
    END
  ) STORED,
  horas_extras    numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN hora_entrada IS NOT NULL AND hora_salida IS NOT NULL
        THEN GREATEST(EXTRACT(EPOCH FROM (hora_salida - hora_entrada)) / 3600 - 8, 0)
      ELSE 0
    END
  ) STORED,
  tipo_hora_extra text CHECK (tipo_hora_extra IN ('normal', 'nocturna', 'feriado')),
  observacion     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(personal_id, fecha)
);

-- ================================================================
-- 8. Índices
-- ================================================================
CREATE INDEX idx_gastos_empresa_fecha   ON gastos(empresa_id, fecha DESC);
CREATE INDEX idx_gastos_estado          ON gastos(estado);
CREATE INDEX idx_personal_empresa       ON personal(empresa_id);
CREATE INDEX idx_asistencias_empresa_fecha ON asistencias(empresa_id, fecha);

-- ================================================================
-- 9. Trigger: crear perfil automáticamente al registrar usuario
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'rol', 'lectura')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- 10. RLS — Helper y políticas
-- ================================================================

-- Función helper: devuelve la empresa_id del perfil del usuario actual
CREATE OR REPLACE FUNCTION public.mi_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT empresa_id FROM public.perfiles WHERE id = auth.uid();
$$;

-- Habilitar RLS en todas las tablas
ALTER TABLE empresas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal   ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

-- ─── empresas ──────────────────────────────────────────────────

CREATE POLICY empresas_select ON empresas FOR SELECT
  USING (id = mi_empresa_id());

CREATE POLICY empresas_insert ON empresas FOR INSERT
  WITH CHECK (true);  -- Cualquier usuario autenticado puede crear empresa

CREATE POLICY empresas_update ON empresas FOR UPDATE
  USING (id = mi_empresa_id())
  WITH CHECK (id = mi_empresa_id());

CREATE POLICY empresas_delete ON empresas FOR DELETE
  USING (
    id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'gerente')
  );

-- ─── perfiles ──────────────────────────────────────────────────

CREATE POLICY perfiles_select ON perfiles FOR SELECT
  USING (empresa_id = mi_empresa_id() OR id = auth.uid());

CREATE POLICY perfiles_update ON perfiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── gastos ────────────────────────────────────────────────────

CREATE POLICY gastos_select ON gastos FOR SELECT
  USING (empresa_id = mi_empresa_id());

CREATE POLICY gastos_insert ON gastos FOR INSERT
  WITH CHECK (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('gerente', 'contador'))
  );

CREATE POLICY gastos_update ON gastos FOR UPDATE
  USING (empresa_id = mi_empresa_id())
  WITH CHECK (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('gerente', 'contador'))
  );

CREATE POLICY gastos_delete ON gastos FOR DELETE
  USING (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'gerente')
  );

-- ─── facturas ──────────────────────────────────────────────────

CREATE POLICY facturas_select ON facturas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gastos
      WHERE gastos.id = facturas.gasto_id
        AND gastos.empresa_id = mi_empresa_id()
    )
  );

CREATE POLICY facturas_insert ON facturas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gastos
      WHERE gastos.id = facturas.gasto_id
        AND gastos.empresa_id = mi_empresa_id()
    )
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('gerente', 'contador'))
  );

CREATE POLICY facturas_update ON facturas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gastos
      WHERE gastos.id = facturas.gasto_id
        AND gastos.empresa_id = mi_empresa_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gastos
      WHERE gastos.id = facturas.gasto_id
        AND gastos.empresa_id = mi_empresa_id()
    )
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('gerente', 'contador'))
  );

CREATE POLICY facturas_delete ON facturas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gastos
      WHERE gastos.id = facturas.gasto_id
        AND gastos.empresa_id = mi_empresa_id()
    )
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'gerente')
  );

-- ─── personal ──────────────────────────────────────────────────

CREATE POLICY personal_select ON personal FOR SELECT
  USING (empresa_id = mi_empresa_id());

CREATE POLICY personal_insert ON personal FOR INSERT
  WITH CHECK (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('gerente', 'contador'))
  );

CREATE POLICY personal_update ON personal FOR UPDATE
  USING (empresa_id = mi_empresa_id())
  WITH CHECK (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('gerente', 'contador'))
  );

CREATE POLICY personal_delete ON personal FOR DELETE
  USING (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'gerente')
  );

-- ─── asistencias ───────────────────────────────────────────────

CREATE POLICY asistencias_select ON asistencias FOR SELECT
  USING (empresa_id = mi_empresa_id());

CREATE POLICY asistencias_insert ON asistencias FOR INSERT
  WITH CHECK (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('gerente', 'contador', 'supervisor'))
  );

CREATE POLICY asistencias_update ON asistencias FOR UPDATE
  USING (empresa_id = mi_empresa_id())
  WITH CHECK (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('gerente', 'contador', 'supervisor'))
  );

CREATE POLICY asistencias_delete ON asistencias FOR DELETE
  USING (
    empresa_id = mi_empresa_id()
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'gerente')
  );
