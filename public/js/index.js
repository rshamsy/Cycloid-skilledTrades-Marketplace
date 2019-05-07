
/**
 * Showing different forms with different routes based on 
 * whether training org or employer
 */
let companySelectButton = $("#companySelectButton");
let trainerSelectButton = $("#trainerSelectButton");
let companyAuthContainer = $("#company-auth");
let trainerAuthContainer = $("#trainer-auth");

companySelectButton.on('click', event => {
    companyAuthContainer.show();
    trainerAuthContainer.hide();
});

trainerSelectButton.on('click', event => {
    trainerAuthContainer.show();
    companyAuthContainer.hide();
});
