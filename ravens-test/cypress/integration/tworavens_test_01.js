// let app_host = 'http://2ravens.org';
let app_host = 'http://127.0.0.1:8080';

describe('TwoRavens system status', function() {
  it('Is cypress alive?', function() {
    expect(true).to.equal(true)
  })
  // http://2ravens.org/rook-custom/healthcheckapp
  /*
  it('Is the TA3 main app running', function() {

    cy
     .request('GET', app_host + '/monitoring/alive', {})
     .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).to.have.property('status', 'ok') // true
     })
     cy.go('back')
  })
  */
  /*
  it('Is the Rook server accessisble via the TA3?', function() {

    cy
     .request('GET', app_host + '/rook-custom/healthcheckapp', {})
     .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).should('include', '<h1>Admin</h1>')
     })
  })
  */
  /*
  it('Is the TA2 server accessisble via the TA3?', function() {
    cy
     .request('GET', app_host + '/d3m-service/Hello', {})
     .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).to.have.property('success', true) // true
     })
  })
  */

  it('Click Python app health check', function() {
    cy.visit(app_host + '/dev-raven-links')
    /// cy.contains('/monitoring/alive').click()
  })





})
