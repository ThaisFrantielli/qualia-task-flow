-- Fix ticket number generation to ignore legacy/non-numeric suffixes (e.g., 'TEMP')
-- that currently break CAST(... AS INTEGER) and block inserts.

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
  next_num INTEGER;
  ticket_num VARCHAR;
  year_txt TEXT;
BEGIN
  year_txt := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(
    MAX(
      CASE
        WHEN SUBSTRING(numero_ticket FROM 10) ~ '^[0-9]+$'
          THEN (SUBSTRING(numero_ticket FROM 10))::INTEGER
        ELSE NULL
      END
    ),
    0
  ) + 1
  INTO next_num
  FROM public.tickets
  WHERE numero_ticket LIKE 'TKT-' || year_txt || '-%';

  ticket_num := 'TKT-' || year_txt || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN ticket_num;
END;
$function$;
