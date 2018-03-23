/*
  To hide/show workspace variable content
*/
$( document ).ready(function() {

  // Down/Up Icons - ico
  const downIcon = 'oi-chevron-bottom';
  const upIcon = 'oi-chevron-top';

  // Button colors - bootstrap
  const btnOpen = 'btn-primary';
  const btnClose = 'btn-secondary';

  $(":button").on( "click", function() {

    // Look for a span class within the button tag
    var span_ico = $(this).find('span');
    if (!span_ico){
      return; //console.log('span not found');
    }else{
      //console.log(span_ico.html());
    }

    // Update the button background and span icon
    //
    if (span_ico.hasClass(downIcon)){
      $(this).removeClass(btnOpen);
      $(this).addClass(btnClose);
      span_ico.removeClass(downIcon);
      span_ico.addClass(upIcon);
    }else{
      $(this).removeClass(btnClose);
      $(this).addClass(btnOpen);
      span_ico.removeClass(upIcon);
      span_ico.addClass(downIcon);
    }
  }); // end button click handler
});
