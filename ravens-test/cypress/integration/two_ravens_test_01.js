// let APP_HOST = 'http://2ravens.org';
let APP_HOST = 'http://127.0.0.1:8080';
let API_VERSION = '2019.2.27';

describe('TwoRavens system status', function() {
  it('Is cypress alive?', function() {
    expect(true).to.equal(true)
  })
  // http://2ravens.org/rook-custom/healthcheckapp

  it('Is the TA3 main app running', function() {

    cy.visit(APP_HOST)
      .request('GET', APP_HOST + '/monitoring/alive', {})
      .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).to.have.property('status', 'ok') // true
     })
  })


  it('Is the TA2 server accessisble via the TA3?', function() {
    cy
     .request('GET', APP_HOST + '/d3m-service/ta2-hello-heartbeat', {})
     .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).to.have.property('success', true) // true
       expect(response.body).to.have.property('data')
       expect(response.body.data).to.have.property('userAgent')
       expect(response.body.data).to.have.property('version', API_VERSION)
     })
  })


  it('Is the Rook server running and accessible via the TA3?', function() {
    cy.visit(APP_HOST + '/dev-raven-links')
      .contains('rook server health check').click()
    cy.contains('rook is running')
    //.request(APP_HOST + '/monitoring/alive')
  })


  it('Is the Mongo server running and accessible via the TA3?', function() {
    cy
      .request('GET', APP_HOST + '/eventdata/api/mongo-healthcheck', {})
      .then((response) => {
        // response.body is automatically serialized into JSON
        expect(response.body).to.have.property('success', true) // true
        expect(response.body.data).to.have.property('version')
        expect(response.body.data).to.have.property('ok', 1.0)
    })
  })


})
