//let app_host = 'http://2ravens.org';
let app_host = 'http://127.0.0.1:8080';

describe('My First Test', function() {
  it('Does not do much!', function() {
    expect(true).to.equal(true)
  })
  // http://2ravens.org/rook-custom/healthcheckapp

  it('Click Rook app health check', function() {
    cy.visit(app_host + '/dev-raven-links')
    cy.contains('/rook-custom/healthcheckapp').click()
  })


  /*
  it('Click Python app health check', function() {
    cy.visit(app_host + '/dev-raven-links')
    /// cy.contains('/monitoring/alive').click()
  })
  */




})
