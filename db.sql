create type wine_type AS ENUM ('red', 'white', 'rose');
create table wine (wine_id bigserial primary key, name varchar(50) NOT NULL, year integer NOT NULL, country VARCHAR(50) NOT NULL, type wine_type NOT NULL, description VARCHAR(500));
