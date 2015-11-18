var config = {};

config.postgre = {};
config.web = {};
config.database = {};

config.postgre.user = process.env.POSTGRE_USER;
config.postgre.password = process.env.POSTGRE_PASSWORD;
config.postgre.host = process.env.POSTGRE_HOST;
config.postgre.database = process.env.POSTGRE_DATABASE;
config.postgre.port = process.env.POSTGRE_PORT;
config.web.port = process.env.PORT;
config.database.searchColumns = ['wine_id', 'name', 'year', 'country', 'type', 'description'];

module.exports = config;
