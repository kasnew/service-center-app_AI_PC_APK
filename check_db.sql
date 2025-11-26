SELECT 'Remont count:', count(*) FROM "Ремонт";
SELECT 'Rashodniki count:', count(*) FROM "Расходники";
SELECT ID, Начало_ремонта FROM "Ремонт" ORDER BY ID DESC LIMIT 5;
