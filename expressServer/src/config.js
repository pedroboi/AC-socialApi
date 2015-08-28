module.exports = {
  host: 'localhost',
  port: 5000,
  secret: 'thisIsASimpleSecret123',
  issuer: 'ACode',
  cookieName:'socialAPI',
  tokenExpiration: 60*24,
  mongo: {
	  uri: 'mongodb://acsocial:ac4success@ds047478.mongolab.com:47478/social',
	  options: {
		  db: {
			safe: true
		  }		  
	  }
  }
};