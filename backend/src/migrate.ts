import { pool } from './db';

const SCHEMA_SQL = `
-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- Tabla de empresas (multiempresa)
create table if not exists empresas (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  ruc         text unique not null,
  color       text default '#2563eb',
  created_at  timestamptz default now()
);

-- Gastos e ingresos
create table if not exists gastos (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid references empresas(id) on delete cascade,
  fecha       date not null,
  descripcion text not null,
  monto       numeric(12,2) not null,
  tipo        text check (tipo in ('gasto','ingreso')) not null,
  mensaje     text,
  saldo       numeric(12,2),
  estado      text check (estado in (
                'pendiente','verificado','conflicto','sin_factura'
              )) default 'pendiente',
  factura_id  uuid,
  created_at  timestamptz default now()
);

-- Facturas con OCR
create table if not exists facturas (
  id                  uuid primary key default uuid_generate_v4(),
  gasto_id            uuid references gastos(id) on delete cascade,
  image_base64        text,
  image_mime          text default 'image/jpeg',
  ocr_fecha           date,
  ocr_monto           numeric(12,2),
  ocr_proveedor       text,
  ocr_ruc             text,
  ocr_tipo            text,
  ocr_numero          text,
  match_status        text check (match_status in (
                        'auto','conflicto','sin_match','manual'
                      )),
  match_score         numeric(4,3),
  created_at          timestamptz default now()
);

-- Personal
create table if not exists personal (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid references empresas(id) on delete cascade,
  dni             text not null,
  nombres         text not null,
  apellidos       text not null,
  celular         text,
  correo          text,
  cargo           text,
  tipo_contrato   text check (tipo_contrato in (
                    'planilla','recibo_honorarios','CAS',
                    'practicante','otro')),
  estado          text check (estado in (
                    'activo','inactivo','vacaciones','licencia'
                  )) default 'activo',
  banco1          text,
  cuenta1         text,
  tipo_cuenta1    text,
  banco2          text,
  cuenta2         text,
  tipo_cuenta2    text,
  sueldo_base     numeric(10,2),
  created_at      timestamptz default now(),
  unique(empresa_id, dni)
);

-- Asistencias
create table if not exists asistencias (
  id              uuid primary key default uuid_generate_v4(),
  personal_id     uuid references personal(id) on delete cascade,
  empresa_id      uuid references empresas(id) on delete cascade,
  fecha           date not null,
  hora_entrada    time,
  hora_salida     time,
  horas_normales  numeric(5,2) generated always as (
    case when hora_entrada is not null and hora_salida is not null
    then least(
      extract(epoch from (hora_salida - hora_entrada))/3600, 8
    ) else 0 end
  ) stored,
  horas_extras    numeric(5,2) generated always as (
    case when hora_entrada is not null and hora_salida is not null
    then greatest(
      extract(epoch from (hora_salida - hora_entrada))/3600 - 8, 0
    ) else 0 end
  ) stored,
  tipo_hora_extra text check (tipo_hora_extra in (
                    'normal','nocturna','feriado')),
  observacion     text,
  unique(personal_id, fecha)
);

-- Usuarios (autenticacion)
create table if not exists usuarios (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid references empresas(id) on delete set null,
  email           text unique not null,
  password_hash   text not null,
  nombre          text not null,
  rol             text check (rol in (
                    'gerente','contador','supervisor','almacenero'
                  )) default 'supervisor',
  activo          boolean default true,
  created_at      timestamptz default now()
);

-- Indices
create index if not exists idx_gastos_empresa_fecha on gastos(empresa_id, fecha desc);
create index if not exists idx_gastos_estado on gastos(estado);
create index if not exists idx_facturas_gasto on facturas(gasto_id);
create index if not exists idx_asistencias_empresa_fecha on asistencias(empresa_id, fecha);
create index if not exists idx_personal_empresa on personal(empresa_id);
create index if not exists idx_usuarios_email on usuarios(email);
`;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    console.log('[db] Migraciones ejecutadas correctamente');
  } catch (err) {
    console.error('[db] Error ejecutando migraciones:', err);
    throw err;
  } finally {
    client.release();
  }
}
