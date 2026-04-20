-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  disclaimer_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (conversation threads)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) DEFAULT 'Nueva sesión',
  summary TEXT,
  message_count INTEGER DEFAULT 0,
  max_alert_level INTEGER DEFAULT 0 CHECK (max_alert_level BETWEEN 0 AND 5),
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  mood_data JSONB,
  alert_level INTEGER DEFAULT 0 CHECK (alert_level BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Psychologists (mock directory)
CREATE TABLE IF NOT EXISTS psychologists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(200),
  bio TEXT,
  avatar_url VARCHAR(500),
  email VARCHAR(255),
  phone VARCHAR(50),
  location VARCHAR(200),
  price_range VARCHAR(100),
  rating NUMERIC(2,1),
  languages VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Seed: mock psychologists
INSERT INTO psychologists (name, specialty, bio, email, phone, location, price_range, rating, languages)
VALUES
  (
    'Dra. Ana Martínez',
    'Ansiedad y Depresión',
    'Psicóloga clínica con 15 años de experiencia en el tratamiento de trastornos de ansiedad y depresión. Enfoque humanista y cognitivo-conductual.',
    'ana.martinez@mindbridge.co',
    '+57 300 123 4567',
    'Bogotá, Colombia',
    '$80.000 - $120.000 COP',
    4.9,
    'Español, Inglés'
  ),
  (
    'Dr. Carlos Rodríguez',
    'Trauma y TEPT',
    'Especialista en trauma psicológico y trastorno de estrés postraumático. Certificado en EMDR y terapia somática.',
    'carlos.rodriguez@mindbridge.co',
    '+57 310 234 5678',
    'Medellín, Colombia',
    '$90.000 - $130.000 COP',
    4.8,
    'Español'
  ),
  (
    'Lic. María González',
    'Psicología Positiva y Bienestar',
    'Especialista en bienestar psicológico, resiliencia y desarrollo personal. Combina psicología positiva con mindfulness.',
    'maria.gonzalez@mindbridge.co',
    '+57 320 345 6789',
    'Cali, Colombia',
    '$70.000 - $100.000 COP',
    4.7,
    'Español, Portugués'
  ),
  (
    'Dr. Andrés López',
    'Adolescentes y Jóvenes Adultos',
    'Psicólogo especializado en la etapa de transición a la adultez. Trabaja con identidad, propósito y salud mental en universitarios.',
    'andres.lopez@mindbridge.co',
    '+57 315 456 7890',
    'Barranquilla, Colombia',
    '$65.000 - $95.000 COP',
    4.6,
    'Español, Inglés'
  ),
  (
    'Lic. Sofía Chen',
    'Burnout y Estrés Laboral',
    'Experta en salud mental ocupacional, burnout y mindfulness. Ofrece sesiones adaptadas a profesionales con alta demanda laboral.',
    'sofia.chen@mindbridge.co',
    '+57 316 567 8901',
    'Bogotá, Colombia',
    '$85.000 - $115.000 COP',
    4.9,
    'Español, Inglés, Chino Mandarín'
  )
ON CONFLICT DO NOTHING;
