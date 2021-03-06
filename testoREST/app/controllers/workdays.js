var express = require('express');
var router = express.Router();
var Workday = require('../models/workday')

// Get all workdays
router.get('/', function(req, res) {
    Workday.find(function(err, workdays) {
        if (err) throw err
        res.json({
            success: true,
            data: workdays
        })
    })
});

// Check if active workday and return data
router.get('/hasActive', function(req, res){
    console.log(req.user);
    Workday.findOne({employeeId: req.user.id, complete: false}, function(err, workday){
        if(err){
            return res.json({success: false, message: "Failed to get workday"});
        }
        if(workday){
            return res.json({success: true, data: workday});
        }else{
            return res.json({success: false, message: "Failed to get workday"});
        }
    });
});

// Insert new workday
router.post('/', function(req, res) {

    var message = "";
    var success = false;

    // Validation
    req.checkBody({
        'start_time': {
            notEmpty: true,
            errorMessage: 'Start time missing'
        },
        'start_km': {
            notEmpty: true,
            errorMessage: 'Start kilometers missing'
        }
    });

    var errors = req.validationErrors();
    if (errors) {
        message = errors[0].msg;
        res.send({
            success: false,
            message: message
        });
        return;
    }

    if(req.body.workdayId != ""){
        Workday.findById(req.body.workdayId, function(err, workday) {
            if (err) {
                return res.send(err);
            }

            workday.employeeId = req.user.id;
            workday.employee = req.user.firstname + ' ' + req.user.lastname
            workday.start_time = req.body.start_time;
            workday.car = req.body.car;
            workday.route = req.body.route;
            workday.start_km = req.body.start_km;

            workday.save(function(err, workday) {
                if (err) {
                    res.send(err);
                }
                res.json({
                    success: true,
                    message: 'Workday updated!',
                    workdayId: workday._id
                });
            });
        });
    }else{
        // New workday object
        var workday = new Workday();

        // Set params
        workday.employeeId = req.user.id;
        workday.employee = req.user.firstname + ' ' + req.user.lastname
        workday.start_time = req.body.start_time;
        workday.car = req.body.car;
        workday.route = req.body.route;
        workday.start_km = req.body.start_km;

        // Insert workday to DB
        workday.save(function(err, workday) {
            if (err) {
                return res.json({
                    success: false,
                    message: "Failed to insert workday to DB"
                });
            }
            console.log(workday);
            return res.json({
                success: true,
                message: "Workday started",
                workdayId: workday._id
            });
        });
    }

});

// Update workday details
router.put('/:workdayId', function(req, res) {

    // Validation
    // req.checkBody({
    //     'stop_time': {
    //         notEmpty: true,
    //         errorMessage: 'Stop time missing'
    //     },
    // 	'stop_km': {
    //         notEmpty: true,
    //         errorMessage: 'Stop kilometers missing'
    //     }
    // });

    var errors = req.validationErrors();
    if (errors) {
        message = errors[0].msg;
        res.send({
            success: false,
            message: message
        });
        return;
    }

    Workday.findById(req.params.workdayId, function(err, workday) {
        if (err) {
            res.send(err);
        }
        var startTime = workday.start_time;
        // Set params
        var deliveries = {};
        var postnord = {};
        var bring = {};
        var innight = {};

        postnord.delivery   = req.body.deliveries.postnord.delivery;
        postnord.delivery   = postnord.delivery == "" ? 0 : postnord.delivery;
        
        bring.delivery      = req.body.deliveries.bring.delivery;
        bring.delivery      = bring.delivery == "" ? 0 : bring.delivery;
        
        postnord.pickup     = req.body.deliveries.postnord.pickup;
        postnord.pickup     = postnord.pickup == "" ? 0 : postnord.pickup;
        
        bring.pickup        = req.body.deliveries.bring.pickup;
        bring.pickup        = bring.pickup == "" ? 0 : bring.pickup;
        
        postnord.unknown    = req.body.deliveries.postnord.unknown;
        postnord.unknown    = postnord.unknown == "" ? 0 : postnord.unknown;
        
        bring.dhl_return    = req.body.deliveries.bring.dhl_return;
        bring.dhl_return    = bring.dhl_return == "" ? 0 : bring.dhl_return;
        
        postnord.nt         = req.body.deliveries.postnord.nt;
        postnord.nt         = postnord.nt == "" ? 0 : postnord.nt;
        
        bring.nt            = req.body.deliveries.bring.nt;
        bring.nt            = bring.nt == "" ? 0 : bring.nt;
        
        innight.packages    = req.body.deliveries.innight.packages;
        innight.packages    = innight.packages == "" ? 0 : innight.packages;
        
        innight.stops       = req.body.deliveries.innight.stops;
        innight.stops       = innight.stops == "" ? 0 : innight.stops;
        
        workday.stop_time   = req.body.stop_time;
        workday.breaks      = req.body.breaks;
        workday.stop_km     = req.body.stop_km;
        workday.adt_info    = req.body.adt_info;
        workday.complete    = req.body.complete;
        deliveries.postnord = postnord;
        deliveries.bring    = bring;
        deliveries.innight  = innight;
        workday.deliveries  = deliveries;

        var start = new Date(startTime.split(' ').join('T'));
        start     = start.getTime() / 1000 / 3600;

        var stop  = new Date(workday.stop_time.split(' ').join('T'));
        stop      = stop.getTime() / 1000 / 3600;

        workday.efficiency  = (postnord.delivery + postnord.pickup + bring.delivery + bring.pickup) /
            ((stop - start) - workday.breaks);

        workday.save(function(err) {
            if (err) {
                res.send(err);
            }
            res.json({
                success: true,
                message: 'Workday updated!'
            });
        });
    });
});

// Delete workday
router.delete('/:workdayId', function(req, res) {
    Workday.remove({
        _id: req.params.workdayId
    }, function(err, workday) {
        if (err) {
            res.send(err);
        }
        res.json({
            success: true,
            message: 'Workday successfully deleted'
        });
    });
});

module.exports = router;
