/**
 * Values that may be overridden with env variables
 *    Note: Outside of Cypress, these variables are set with a 'CYPRESS_' prefix
 *      Example:
 *       - Set in docker:
 *         `--env CYPRESS_TWO_RAVENS_BASE_URL=http://metadata.2ravens.org`
 *       - Appears in cypress as:
 *         `TWO_RAVENS_BASE_URL=http://metadata.2ravens.org`
 *          - The 'CYPRESS_' prefix is removed
 */
const TWO_RAVENS_BASE_URL = Cypress.env('TWO_RAVENS_BASE_URL') || 'http://2ravens.org'
const TA3TA2_API_VERSION = Cypress.env('TA3TA2_API_VERSION') || '2019.4.11'

let APP_TEST_URL;

describe('TwoRavens component health checks', function() {

  it('Initial state', function() {
    cy.log('Env variables: ' + JSON.stringify(Cypress.env()))

    expect(true).to.equal(true)
  })

  // http://2ravens.org/rook-custom/healthCheck.app


  it('Is the TA3 main app running?', function() {
    APP_TEST_URL = TWO_RAVENS_BASE_URL + '/monitoring/alive'
    cy.log('Test url: ' + APP_TEST_URL)

    cy.visit(TWO_RAVENS_BASE_URL)
      .request('GET', APP_TEST_URL, {})
      .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).to.have.property('status', 'ok') // true
     })
     cy.log('TA3 main app is running.')
  })

  it('Is the Rook server running and accessible via the TA3?', function() {
    APP_TEST_URL = TWO_RAVENS_BASE_URL + '/dev-raven-links'
    cy.log('Test url: ' + APP_TEST_URL)

    cy.visit(APP_TEST_URL)
      .contains('rook server health check').click()
    cy.contains('rook is running')

    cy.log('Rook server is running and responded.')
    //.request(TWO_RAVENS_BASE_URL + '/monitoring/alive')
  })



  it('Is the TA2 server accessisble via the TA3? ', function() {
    APP_TEST_URL = TWO_RAVENS_BASE_URL + '/d3m-service/ta2-hello-heartbeat'
    cy.log('Test url: ' + APP_TEST_URL)

    cy.request('GET', APP_TEST_URL, {})
      .then((response) => {
       // response.body is automatically serialized into JSON
       expect(response.body).to.have.property('success', true) // true
       expect(response.body).to.have.property('data')
       expect(response.body.data).to.have.property('userAgent')
       expect(response.body.data).to.have.property('version', TA3TA2_API_VERSION)
     })
     cy.log('TA2 server is running and responded.')
  })


  it('Is the Mongo server running and accessible via the TA3? ', function() {
    APP_TEST_URL = TWO_RAVENS_BASE_URL + '/eventdata/api/mongo-healthcheck'
    cy.log('Test url: ' + APP_TEST_URL)

    cy.request('GET', APP_TEST_URL, {})
      .then((response) => {
        // response.body is automatically serialized into JSON
        expect(response.body).to.have.property('success', true) // true
        expect(response.body.data).to.have.property('version')
        expect(response.body.data).to.have.property('ok', 1.0)
    })
    cy.log('Mongo server is running and responded.')

  })


})
