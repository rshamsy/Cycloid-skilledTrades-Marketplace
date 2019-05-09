const express = require('express'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    firebase = require('firebase'),
    // admin = require('firebase-admin'),
    // serviceAccount = require('../cycloid-25cab-firebase-adminsdk-vrj16-47ca9a49d0.json'),
    methodOverride = require('method-override');
    // firebaseui = require('firebaseui');
    
const app = express();

let firebaseConfig = {
    apiKey: "AIzaSyAGheMO8FQ_P32yHaSDMg1XoibyqRd9DGw",
    authDomain: "cycloid-25cab.firebaseapp.com",
    databaseURL: "https://cycloid-25cab.firebaseio.com",
    projectId: "cycloid-25cab",
    storageBucket: "cycloid-25cab.appspot.com",
    messagingSenderId: "820408586358"
};
firebase.initializeApp(firebaseConfig);

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "https://cycloid-25cab.firebaseio.com"
// });



app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));
app.use(methodOverride("_method"));

// const urlDB = "mongodb://localhost:27017/cycloid-app";
const urlDB = process.env.DATABASEURL;
mongoose.connect(urlDB, {
    useNewUrlParser: true, 
    useFindAndModify: false,
    useCreateIndex: true
});

const userSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    company: {type: mongoose.Schema.Types.ObjectId, ref:'Employer'},
    uid: String
});
let User = mongoose.model('User', userSchema);

const employerSchema = new mongoose.Schema({
    company: String,
    users: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    size: String,
    website: String, 
    type: String, 
    found: String, 
    geographicReach: String, 
    aboutCo: String, 
    roles: [{type: mongoose.Schema.ObjectId, ref: "Role"}]
});
let Employer = mongoose.model('Employer', employerSchema);

const roleSchema = new mongoose.Schema({
    company: {type: mongoose.Types.ObjectId, ref: 'Employer'},
    roleTitle: String,
    location: String, 
    dateUpdated: {type: Date, default: Date.now()},
    majorTradeArea: String, 
    tradeName: String, 
    responsibilities: String, 
    journeyperson: String, 
    skillsReq: String, 
    trainingReq: String, 
    trainingProvided: String,
    fulltimePay: String
});
//.index to pass what fields to text-search by (ie what index)
roleSchema.index({'$**': 'text'});
let Role = mongoose.model('Role', roleSchema);

const trainerUserSchema = new mongoose.Schema({
    firstname: String, 
    lastname: String, 
    institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution'},
    uid: String
});
let TrainerUser = mongoose.model('trainerUser', trainerUserSchema);

const institutionSchema = mongoose.Schema({
    institutionName: String,
    users: [{type: mongoose.Schema.Types.ObjectId, ref: 'TrainerUser'}],
    website: String, 
    about: String, 
    savedRoles: [{type: mongoose.Schema.ObjectId, ref: "Role"}]
    //savedRoles represents roleIds of roles saved by trainerUser - references same db doc created by employerUser. 
});
let Institution = mongoose.model('Institution', institutionSchema);

function authCheckMiddleware (req, res, next) {
    firebase.auth().onAuthStateChanged(user => {
        if(!user) {
            console.log("In middleware - user logged out.");
            
            // Have flash message here to indicate sign in required

            res.redirect('/');
            return;
            // res.render('index'); 
        } else {
            next();
        }
    });
};

/*
Following middleware to be used to pass a res.locals variables that can be used to place 
logout/login buttons in navbar that depend on sign-in requirement
*/
app.use((req, res, next) => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            res.locals.userLoggedIn = true;
            return next();
        } else {
            res.locals.userLoggedIn = false;
            console.log("In middleware for creating res.locals userLoggedIn attribute");
            return next();
        };
    });
    
});

app.get('/', (req, res) => {
    res.render('index');
    return;
});


app.post('/company/register', (req, res) => {


    firebase.auth().createUserWithEmailAndPassword(req.body.email, req.body.pw)
        
    .then((user) => {
        
        
        var createdUser = new User({
            firstname: req.body.firstName,
            lastname: req.body.lastName,
            uid: user.user.uid
        });

        let companyName = req.body.coName;
        Employer.findOne({company: companyName}, (err, employer) => {
            if(err) console.log(err);

            if(employer){
                createdUser.company = employer._id;
                employer.users.push(createdUser._id);

                createdUser.save();
                employer.save();

                console.log('employer found; user info in employer; employer info in user')
                console.log('employer: \n'+employer);
                console.log('user: \n'+createdUser);
            }
            else{
                var createdEmployer = new Employer({
                    company: companyName,
                    users: [createdUser._id]
                });

                createdUser.company = createdEmployer._id;

                createdUser.save();
                createdEmployer.save();

                console.log('employer created and saved: \n'+ createdEmployer);
                console.log('user created and saved: \n'+createdUser);
            }
        });
        res.redirect('/');
        return;
    })
    .catch(error => {
        console.log('Error creating new user in firebase, or new employer or new user in mongodb:', error);
        if (error.code === 'auth/email-already-in-use'){
            res.send("Already registered with this email - please log in with that email, or create new account with another email");
            return;
        };
    });

    
});

app.post('/company/login', (req, res) => {

    firebase.auth().signInWithEmailAndPassword(req.body.emailInput, req.body.pwInput)
    .then((user)=>{
        console.log("Successful firebase login");
        // res.send(user);
        res.redirect('/company/roles');
        return;
    })
    .catch((error) => {
        console.log("Error Code: \n" + error.code + "\nError Message: \n" + error.message);
        res.send(error.message);
        return;
    });

});

app.get('/logout', (req, res) => {
    firebase.auth().signOut().then(() => {
        res.redirect('/');
        return;
    });
});

app.get('/company/roles', authCheckMiddleware, (req, res) => {

    firebase.auth().onAuthStateChanged(user => {
        
        let searchUid = user.uid;
        User.findOne({uid: searchUid}, (err, userFound) => {
            if (err) console.log("Error finding user with uid: " + err);
        })
        .populate({
            path: 'company',
            model: 'Employer',
            populate: {
                path: 'roles',
                model: 'Role'
            }
        })
        .exec((err, userDoc) => {
            if (err) console.log("Error deep populating: " + err);
            if(userDoc) {
                try {
                    // res.send(userDoc);
                    res.render('home', {company: userDoc.company});
                    return;
                }
                catch (err) {
                    console.log("res.render issue:\n" + err);

                }
                
            } else {
                console.log("userDoc is null");
            }
        })

    });

    
});

app.get('/company/roles/new',authCheckMiddleware, (req, res) => {
    res.render('new-role');
    return;
});

app.post('/company/roles/new', (req, res) => {

    //create new Role from scratch using each req.body param!

    firebase.auth().onAuthStateChanged( user => {
        // console.log(user);

        User.findOne({uid: user.uid}, (err) => {
            if(err) console.log("Error finding current user's User model Doc: \n"+err);
        }).populate({
            path: "company"
        }).exec((err, userFound) => {
            if(err) console.log("Error after populating "+err);
            if (userFound) {
                var newRole = new Role({
                    roleTitle: req.body.roleTitle,
                    location: req.body.location,
                    majorTradeArea: req.body.majorTradeArea,
                    tradeName: req.body.tradeName,
                    responsibilities: req.body.responsibilities,
                    journeyperson: req.body.journeyperson, 
                    skillsReq: req.body.skillsReq,
                    trainingReq: req.body.trainingReq,
                    trainingProvided: req.body.trainingProvided,
                    fulltimePay: req.body.fulltimePay,
                    company: userFound.company._id
                });

                newRole.save();  
                // console.log("New Role created and saved\n" + newRole);


                Employer.findById(newRole.company, (err, company) => {
                    if(err) console.log("Error finding employer:\n "+err);
                    if(company) {
            
                        // console.log("newRole._id: \n"+ newRole._id);
                        // console.log("company.roles before push\n"+ company.roles);
                        company.roles.push(newRole._id);
                        // console.log("company.roles after push\n"+ company.roles);
                        company.save();
                        // console.log("Company updated and saved\n" + company);
                    } else {
                        console.log("Employer.findById returned null company")
                    }
                });

                // console.log("User after roles update:\n" + userFound);

                res.redirect('/company/roles');
                return;

            } else {
                console.log("No user found");
            }
        });
            
    });
    
    
});

app.get("/company/roles/:id", authCheckMiddleware, (req, res) => {
    /**
     * TO-DO: 
     * First authenticate whether user signed in owns the role, and then they can only see edit button.
     */


    Role.findOne({ _id: req.params.id }, (err, role) => {
        if(err) console.log(err);
    }).
    populate("company").
    exec((err, role) => {
        if (err) {
            res.send(err);
            return;
        }
        else {
            // res.send(role);
            res.render('role', {role: role});
            return;
        }
        
    });

    
});

app.get("/company/roles/:id/edit", authCheckMiddleware, (req, res) => {
    
    /**
     * TO-DO: 
     * First authenticate whether user signed in owns the role, and then they can only see edit button.
     */
    
    Role.findById(req.params.id, (err, role) => {
        if (err) console.log(err);
    }).
    populate("company").
    exec((err, role) => {
        if(err) console.log(err);
        res.render('edit-role', {role: role});
        return;
    });
    
});
app.put("/company/roles/:id/edit", authCheckMiddleware, (req, res) => {

    /**
     * TO-DO: 
     * First authenticate whether user signed in owns the role, and then they can only see edit button.
     */


    Role.findOneAndUpdate({ _id: req.params.id }, {
        roleTitle: req.body.roleTitle,
        majorTradeArea: req.body.majorTradeArea,
        tradeName: req.body.tradeName,
        location: req.body.location,
        responsibilities: req.body.responsibilities,
        journeyperson: req.body.journeyperson,
        skillsReq: req.body.skillsReq,
        trainingReq: req.body.trainingReq,
        trainingProvided: req.body.trainingProvided,
        dateUpdated: Date.now()
    }, (err, role) => {
        if (err) console.log(err);
        else{
            role.save();
            res.redirect('/company/roles/'+req.params.id);
            return;
        }
    });
});

app.delete("/company/roles/:id", authCheckMiddleware, (req, res) => {

    /**
     * TO-DO: 
     * First authenticate whether user signed in owns the role, and then they can only see edit button.
     */

    Role.findOneAndRemove({ _id: req.params.id }, (err, role) => {
        if(err) console.log(err)
        else {
            res.redirect('/company/roles');
            return;
            // Go to edit role route and add a delete button that leads to this route.
        }
    });
});

app.get('/company/employer/:id', authCheckMiddleware, (req, res) => {
    Employer.findById(req.params.id, (err, empFound) => {
        if(err) console.log(err);
        else {
            res.render('employer', {employer: empFound});
            return;
        }
    });
});

app.get('/company/employer/:id/edit', authCheckMiddleware, (req, res) => {

    /**
     * TO-DO: 
     * First authenticate whether user signed in belongs to company, and then they can only see edit button.
     */

    Employer.findById(req.params.id, (err, employerFound) => {
        if(err) console.log(err);
        else {
            res.render('edit-employer', {employer: employerFound});
            return;
        }
    });
});

app.put('/company/employer/:id/edit', authCheckMiddleware, (req, res) => {
    
    Employer.findOneAndUpdate({ _id: req.params.id }, {
        company: req.body.company,
        size: req.body.size,
        website: req.body.website,
        type: req.body.type,
        found: req.body.found,
        geographicReach:  req.body.geographicReach,
        aboutCo: req.body.aboutCo
    } , (err, employer) => {
        if(err) console.log(err);
        else{
            employer.save();
            res.redirect('/company/employer/'+req.params.id);
            return;
        }
    });
});

app.post('/trainer/register', (req, res) => {
/*
Register new trainer as trainer
Create new model/schema for trainer, rather than employer. 
*/

// res.send(req.body);

    firebase.auth().createUserWithEmailAndPassword(req.body.email, req.body.pw)
    .then(user => {
        let newTrainerUser = new TrainerUser({
            firstname: req.body.firstName,
            lastname: req.body.lastName,
            uid: user.user.uid
        });

        Institution.findOne({ institutionName: req.body.instName }, (err, instDoc) => {
            if(err) console.log("Error encountered looking for Insitution");

            if(instDoc){
                instDoc.users.push(newTrainerUser._id);
                newTrainerUser.institution = instDoc._id;
               
                instDoc.save();
                newTrainerUser.save();
            } else {
                let newInstitution = new Institution({
                    institutionName: req.body.instName,
                    users: [newTrainerUser._id]
                });
                newTrainerUser.institution = newInstitution._id;
                newInstitution.save();
                newTrainerUser.save();
            };
            console.log('successfully created and saved new user');
        });
        res.redirect('/');
        return;
    })
    .catch(err => {
        console.log('Error creating new training user in firebase, or new inst or traineruser in mongo\n', err);
    });
    

});

app.post('/trainer/login', (req, res) => {
    firebase.auth().signInWithEmailAndPassword(req.body.emailInput, req.body.pwInput)
    .then((user)=>{
        console.log("Successful firebase login");
        // res.send(user);
        res.redirect('/trainer/roles');
        return;
    })
    .catch((error) => {
        console.log("Error Code: \n" + error.code + "\nError Message: \n" + error.message);
    });
});


app.get('/trainer/roles', authCheckMiddleware, (req, res) => {
        
    
    Role.find({}, (err, userFound) => {
        if (err) console.log("Error finding roles: " + err);
    })
    .populate({
        path: 'company',
        model: 'Employer'
    })
    .exec((err, roleDocs) => {
        if (err) console.log("Error deep populating: " + err);
        if(roleDocs) {
            // res.send(roleDocs);
            res.render('trainer-home', {roles: roleDocs});
            return;

        } else {
            console.log("roleDoc is null");
        }
        })


});

app.get('/trainer/roles/:id', authCheckMiddleware, (req, res) => {
    
    Role.findOne({ _id: req.params.id }, (err, role) => {
        if(err) console.log(err);
    }).
    populate("company").
    exec((err, role) => {
        if (err) res.send(err);
        // res.send(role);
        res.render('trainer-role', {role: role});
        return;
    });
});

app.post('/trainer/roles/:id/save', authCheckMiddleware, (req, res) => {
    let roleId = req.param.id;
    // console.log(role.Id);
    console.log("In post");
});




// app.get('/trainer/roles', (req, res) => {
//     // res.send('loggedin');
//     var searchQuery = "te";
//     // var searchQuery = req.query.searchQuery;
//     Role.find({
//         $text: {$search: new RegExp(searchQuery)}
//     })
//     .then(searchResults => {
//         res.send(searchResults);
//     })
//     .catch(err => {
//         console.log(err);
//     })
// });

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});