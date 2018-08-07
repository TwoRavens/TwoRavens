//----------------------------------------
//
//  Used by "resultsplotinit"
//
//  initialPipelineInfo = allPipelineInfo[selectedPipeline]
//----------------------------------------
function FittedSolutionUtil(initialPipelineInfo) {
  this.initialPipelineInfo = initialPipelineInfo;

  // for error checking
  this.errorFound = false;
  this.userMessage = null;

  //--------------------
  // addErrorMessage
  //--------------------
  this.addErrorMessage = function(errMsg){
    this.errorFound = true;
    this.userMessage = errMsg;
  }

  //--------------------
  // run the main process
  //--------------------
  this.getFittedSolution = function(){

    let finalFittedId, finalFittedDetailsUrl, produceDetailsUrl, finalProduceDetailsUrl, hold3;
    let res8, res55, res56, res58, res59;

    let chosenSolutionId = this.initialPipelineInfo.response.solutionId;

    //----------------------------------------
    // (1) Make FitSolution call using "chosenSolutionId"
    //----------------------------------------
    let res5 = await makeRequest(D3M_SVC_URL + '/FitSolution', CreateFitDefinition(chosenSolutionId));

    // Check if call failed
    if (res5.success === false){
        this.addErrorMessage(res5.message)
        return;
    }

    // Get the "requestId"
    let fittedId = res5.data.requestId;

    //----------------------------------------
    // (2) Make GetFitSolutionResults call with "fittedId"
    //----------------------------------------
    console.log('GetFitSolutionResults: resultsplotinit')

    let res6 = await makeRequest(D3M_SVC_URL + `/GetFitSolutionResults?resultsplotinit`, {requestId: fittedId});
    // Check if call failed
    if (res6.success == false){
      this.addErrorMessage(res6.message)
      return;
    }

    
  } // end getFittedSolution


} // end class FittedSolutionUtil

//----------------------------------------
//
//  Used by "resultsplotinit"
//
//  initialPipelineInfo = allPipelineInfo[selectedPipeline]
//----------------------------------------
function getFittedSolution(initialPipelineInfo) {

  let finalFittedId, finalFittedDetailsUrl, produceDetailsUrl, finalProduceDetailsUrl, hold3;
  let res8, res55, res56, res58, res59;

  let chosenSolutionId = allPipelineInfo[selectedPipeline].response.solutionId;

  //----------------------------------------
  // Make FitSolution call using "chosenSolutionId"
  //----------------------------------------
  let res5 = await makeRequest(D3M_SVC_URL + '/FitSolution', CreateFitDefinition(chosenSolutionId));

  // Check if call failed
  if (res5.success == false){
      return {success: false, message: res5.message};
  }

  // Get the "requestId"
  //
  let fittedId = res5.data.requestId;

  //----------------------------------------
  // Make GetFitSolutionResults call with "fittedId"
  //----------------------------------------
  console.log('GetFitSolutionResults: resultsplotinit')

  let res6 = await makeRequest(D3M_SVC_URL + `/GetFitSolutionResults?resultsplotinit`, {requestId: fittedId});
  // Check if call failed
  if (res6.success == false){
      return {success: false, message: res6.message};
  }

  //----------------------------------------
  // Make continuous call to poll for results
  //----------------------------------------
  let fittedDetailsUrl = res6.data.details_url + '?DEBUG-CALL-1';

  // Flag for whether we have a fitted solution available yet to produce predicted values from.
  let fittingfinished = false;
  let fittingfinishedError = -1;

  let fittingIntervalId = setInterval(async function() {

    if(!fittingfinished){
        let res7 = await updateRequest(fittedDetailsUrl);


        if (res7.success === false){
          fittingfinished = true;
          fittingfinishedError = res7.message;
        }

        if(res7.success === true){

          get

            if ((res7.data.is_finished)&&(res7.data.is_error)){
              fittingfinished = true;
              fittingfinishedError = res7.data.user_message;

            }else if(res7.data.is_finished){

                // Check that the responses list has at least 1 item
                //
                if ((res7.data.responses.list) && (res7.data.responses.list.length > 0)){

                  finalFittedDetailsUrl = res7.data.responses.list[0].details_url + '?DEBUG-CALL-2';
                  res8 = await updateRequest(finalFittedDetailsUrl);
                  //-------------------
                  console.log('--- RP debug ---');
                  console.log(JSON.stringify(res8));
                  //-------------------

                  finalFittedId = res8.data.response.fittedSolutionId;
                  console.log('fittedSolutionId' + finalFittedId);

                  res55 = await makeRequest(D3M_SVC_URL + '/ProduceSolution', CreateProduceDefinition(finalFittedId));
                  console.log("--Finished Fitting");
                  console.log(res55);
                  let produceId = res55.data.requestId;
                  res56 = await makeRequest(D3M_SVC_URL + `/GetProduceSolutionResults`, {requestId: produceId});
                  console.log("--Get Produce");
                  console.log(res56);
                  produceDetailsUrl = res56.data.details_url + '?DEBUG-CALL-3';

                }else{
                  console.log('>>>> NO responses found in list');
                }
                fittingfinished = true;
            }; // result finished successfully
        };
        if(fittingfinished===true){
          clearInterval(fittingIntervalId);
        }
    };


} // END: getFittedSolution
