const APP_BASE_URL = process.env.APP_BASE_URL || 'http://2ravens.org';

//const APP_BASE_URL = 'http://localhost:8080';
//const APP_BASE_URL = 'http://2ravens.org';
const API_VERSION = '2019.2.27';
let APP_TEST_URL;

describe('TwoRavens system status', function() {

  it('Is cypress alive?', function() {
    expect(true).to.equal(true)
  })

  // http://2ravens.org/rook-custom/healthcheckapp


  APP_TEST_URL = APP_BASE_URL + '/monitoring/alive'
  it('Is the TA3 main app running ' + APP_TEST_URL, function() {

    cy.visit(APP_BASE_URL)
      .request('GET', APP_TEST_URL, {})
      .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).to.have.property('status', 'ok') // true
     })
     cy.log('TA3 main app is running.')
  })

/*
  it('Is the TA2 server accessisble via the TA3?', function() {
    cy
     .request('GET', APP_BASE_URL + '/d3m-service/ta2-hello-heartbeat', {})
     .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).to.have.property('success', true) // true
       expect(response.body).to.have.property('data')
       expect(response.body.data).to.have.property('userAgent')
       expect(response.body.data).to.have.property('version', API_VERSION)
     })
     cy.log('TA2 server is running and responded.')
  })


  it('Is the Rook server running and accessible via the TA3?', function() {
    cy.visit(APP_BASE_URL + '/dev-raven-links')
      .contains('rook server health check').click()
    cy.contains('rook is running')

    cy.log('Rook server is running and responded.')
    //.request(APP_BASE_URL + '/monitoring/alive')
  })


  it('Is the Mongo server running and accessible via the TA3?', function() {
    cy
      .request('GET', APP_BASE_URL + '/eventdata/api/mongo-healthcheck', {})
      .then((response) => {
        // response.body is automatically serialized into JSON
        expect(response.body).to.have.property('success', true) // true
        expect(response.body.data).to.have.property('version')
        expect(response.body.data).to.have.property('ok', 1.0)
    })
    cy.log('Mongo server is running and responded.')

  })
*/

})
