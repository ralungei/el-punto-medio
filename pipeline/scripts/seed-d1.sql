-- Seed 16 Spanish media sources for El Punto Medio
INSERT INTO sources (name, url, rss_url, political_lean, active) VALUES
  ('El País', 'https://elpais.com', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', 'center-left', 1),
  ('El Mundo', 'https://elmundo.es', 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml', 'center-right', 1),
  ('ABC', 'https://abc.es', 'https://www.abc.es/rss/2.0/espana/', 'right', 1),
  ('La Vanguardia', 'https://lavanguardia.com', 'https://www.lavanguardia.com/rss/home.xml', 'center', 1),
  ('elDiario.es', 'https://eldiario.es', 'https://www.eldiario.es/rss/', 'left', 1),
  ('La Razón', 'https://larazon.es', 'https://www.larazon.es/?outputType=xml', 'right', 1),
  ('OKDiario', 'https://okdiario.com', 'https://okdiario.com/feed', 'right', 1),
  ('El Confidencial', 'https://elconfidencial.com', 'https://rss.elconfidencial.com/espana/', 'center', 1),
  ('20 Minutos', 'https://20minutos.es', 'https://www.20minutos.es/rss/', 'center', 1),
  ('Newtral', 'https://newtral.es', 'https://www.newtral.es/feed/', 'center-left', 1),
  ('El Español', 'https://elespanol.com', 'https://www.elespanol.com/rss/', 'center-right', 1),
  ('Público', 'https://publico.es', '', 'left', 1),
  ('RTVE', 'https://rtve.es', '', 'public', 1),
  ('El Periódico', 'https://elperiodico.com', 'https://www.elperiodico.com/es/cds/rss/?id=board.xml', 'center-left', 1),
  ('Agencia SINC', 'https://agenciasinc.es', '', 'public', 1),
  ('Redacción Médica', 'https://redaccionmedica.com', '', 'public', 1);
