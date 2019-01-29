/**

Steps for GetSearchSolutionsResults


*/
import {alertError} from "./app";

export async function makeGetSearchSolutionsRequest(searchId){
  console.log('makeGetSearchSolutionsRequest 1');

  let res2 = await makeRequest(D3M_SVC_URL + '/GetSearchSolutionsResults',
                                 {searchId: searchId});
  console.log('makeGetSearchSolutionsRequest 2');

    if (!res2.success){
        alertError('Failed to get GetSearchSolutionsResults: ' + res2.message);
        estimateLadda.stop();
        return;
    }else if (res2.data.is_error){
        alertError('Error with GetSearchSolutionsResults: ' + res2.data.user_msg);
        estimateLadda.stop();
        return;
    }
    console.log('makeGetSearchSolutionsRequest 3');
}
