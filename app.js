const express = require('express'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose');

    
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));

const urlDB = "mongodb://localhost:27017/cycloid-app";
// const urlDB = "mongodb://rshamsy:cycloidapp1@ds239936.mlab.com:39936/cycloid-app"
mongoose.connect(urlDB, {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: String, 
    company: {type: mongoose.Schema.Types.ObjectId, ref:'Employer'},
    password: String
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
let Role = mongoose.model('Role', roleSchema);

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/register', (req, res) => {
    
    var createdUser = new User({
        firstname: req.body.firstName,
        lastname: req.body.lastName,
        email: req.body.email,
        password: req.body.pw
    });

    let companyName = req.body.coName;
    Employer.findOne({company: companyName}, (err, employer) => {
        if(err) console.log(err);

        if(employer){
            createdUser.company = employer._id;
            employer.users.push(createdUser._id);

            createdUser.save();
            employer.save();

            
            console.log('This is not the first time with this employer');
            console.log('employer: \n'+employer);
            console.log('user created and saved: \n'+createdUser);
        }
        else{
            var createdEmployer = new Employer({
                company: companyName
            });

            createdUser.company = createdEmployer._id;
            createdEmployer.users.push(createdUser._id);

            createdUser.save();
            createdEmployer.save();

            console.log('This IS the first time with this employer');
            console.log('employer created and saved: \n'+ createdEmployer);
            console.log('user created and saved: \n'+createdUser);
        }
        res.redirect('/');
    });
    
});

app.post('/login', (req, res) => {

    User.findOne({
        "email": req.body.emailInput,
        "password": req.body.pwInput
    }, (err, found) => {
        if(err) {
            console.log(err);
        }
        if(!found){
            res.redirect('/');
        }
        else {
            console.log(found);
            currentUser = found;
            res.redirect('/roles');
        }
    });

});

app.get('/users', (req, res) => {
    Employer.findOne({company:"tottenham"}, (err) => {
        if (err) console.log(err);
    })
    .populate('users')
    .exec((err, users) => {
        res.send(users);
    });
});

app.get('/roles', (req, res) => {
    /*
    Issue with first finding roles - if new registration, new user does not have roles!! 
    It would have been best starting with employer finding, and then populating roles
    rather than finding roles and populating the company. But what's done is done
    */
    Role.find({company: currentUser.company}, (err, docs) => {
        if (err) console.log(err);
    }).
    populate('company').
    exec((err,companyRoles) => {
        if(err) console.log(err);
        // res.send(companyRoles);
        if (companyRoles) res.render('home', {roles: companyRoles, company: currentUser.company});
        else {
            /*
            Following code replaced with line <<res.render('home', companyRoles)>> 
            because company information is populated, and company schema has all 
            emmployer related info that would be required anyways, and is 
            associated to each role. 
            */
            Employer.find({company: currentUser.company}, (err, docs) => {
                if(err) console.log(err);
            }).
            populate('roles').
            exec((err, employerDocs) => {
                if(err) console.log(err);
                let rolesRenderObject = {
                    roles: companyRoles,
                    employer: employerDocs
                }
                res.render('home', rolesRenderObject);
            });
        }
    });


    
});

app.get('/roles/new',(req, res) => {
    res.render('new-role');
});

app.post('/roles/new', (req, res) => {

    //create new Role from scratch using each req.body param!

    
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
        company: currentUser.company
    })
    
    newRole.save();

    // add association of role created to employer doc
    Employer.findById(currentUser.company, (err, company) => {
        if(err) console.log(err);
        else{
            company.roles.push(newRole._id);
            company.save();
        };
    });
    
    // Role.findOne(req.body, (err, role) => {
    //     if (err) console.log(err);
    //     role.company = currentUser.company;
    //     role.save((err)=>{
    //         if (err) console.log(err);
    //         console.log("Role created and saved:\n"+role);
    //     });
    // })

    
    

    res.redirect('/roles');
});

app.get("/roles/:id", (req, res) => {
    Role.findById(req.params.id, (err, role) => {
        if(err) console.log(err);
    }).
    populate("company").
    exec((err, role) => {
        // res.send(role);
        res.render('role', {role: role});
    });
});

app.get("/roles/:id/edit", (req, res) => {
    Role.findById(req.params.id, (err, role) => {
        if (err) console.log(err);
    }).
    populate("company").
    exec((err, role) => {
        if(err) console.log(err);
        res.render('edit-role', {role: role});
    });
    
});
app.post("/roles/:id/edit", (req, res) => {
    Role.findByIdAndUpdate(req.params.id, {
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
            res.redirect('/roles/'+req.params.id);
        }
    });
});

app.get('/employer/:id', (req, res) => {
    Employer.findById(req.params.id, (err, empFound) => {
        if(err) console.log(err);
        else {
            res.render('employer', {employer: empFound});
        }
    });
});

app.get('/employer/:id/edit', (req, res) => {
    Employer.findById(req.params.id, (err, employerFound) => {
        if(err) console.log(err);
        else {
            res.render('edit-employer', {employer: employerFound});
        }
    });
});

app.post('/employer/:id/edit', (req, res) => {
    
    Employer.findByIdAndUpdate(req.params.id, {
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
            res.redirect('/employer/'+req.params.id);
        }
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});