/**

Steps for GetSearchSolutionsResults


*/

export async function makeGetSearchSolutionsRequest(searchId){
  console.log('makeGetSearchSolutionsRequest 1');

  let res2 = await makeRequest(D3M_SVC_URL + '/GetSearchSolutionsResults',
                                 {searchId: searchId});
  console.log('makeGetSearchSolutionsRequest 2');

    if (!res2.success){
        alert('Failed to get GetSearchSolutionsResults: ' + res2.message);
        estimateLadda.stop();
        return;
    }else if (res2.data.is_error){
        alert('Error with GetSearchSolutionsResults: ' + res2.data.user_msg);
        estimateLadda.stop();
        return;
    }
    console.log('makeGetSearchSolutionsRequest 3');
}
