function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r !== null) return unescape(r[2]); return 'changping';
}

var distName = getQueryString('dist')
var dists = {
    'changping': '昌平区',
    'chaoyang': '朝阳区',
    'daxing': '大兴区',
    'dongcheng': '东城区',
    'fangshan': '房山区',
    'fengtai': '丰台区',
    'haidian': '海淀区',
    'huairou': '怀柔区',
    'mentougou': '门头沟区',
    'miyun': '密云县',
    'pinggu': '平谷区',
    'shijingshan': '石景山区',
    'xicheng': '西城区',
    'yanqing': '延庆县'
}
var currentDist = document.getElementById('current-dist')
currentDist.innerHTML = '当前区县：' + dists[distName]

var USER_SPEED = "slow"

var width = 1000,
    height = 1000,
    padding = 1,
    maxRadius = 3;
// color = d3.scale.category10();

var sched_objs = [],
    curr_minute = 0;

var act_codes = JSON.parse(
    `[{"index":12,"short":"怀柔区","locX":"560","locY":"230"},
				{"index":14,"short":"密云县","locX":"700","locY":"370"},
				{"index":11,"short":"延庆县","locX":"360","locY":"380"},
				{"index":15,"short":"平谷区","locX":"750","locY":"520"},
				{"index":1,"short":"顺义区","locX":"600","locY":"550"},
				{"index":10,"short":"海淀区","locX":"420","locY":"620"},
				{"index":2,"short":"朝阳区","locX":"520","locY":"640"},
				{"index":5,"short":"西城区","locX":"450","locY":"670"},
				{"index":16,"short":"东城区","locX":"495","locY":"680"},
				{"index":7,"short":"房山区","locX":"260","locY":"770"},
				{"index":0,"short":"通州区","locX":"600","locY":"720"},
				{"index":13,"short":"昌平区","locX":"400","locY":"520"},
				{"index":8,"short":"门头沟区","locX":"250","locY":"620"},
				{"index":9,"short":"石景山区","locX":"375","locY":"660"},
				{"index":4,"short":"大兴区","locX":"480","locY":"790"},
				{"index":6,"short":"丰台区","locX":"420","locY":"700"}]`
)

var speeds = { "slow": 1000, "medium": 200, "fast": 50 };

var notes_index = 0;

// Coordinates for activities
var foci = {};
act_codes.forEach(function (code, i) {
    foci[code.index] = { x: code.locX, y: code.locY }
});


// Start the SVG
var svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height);


// Load data and let's do it.
d3.tsv("data/days-simulated-v2.tsv." + distName, function (error, data) {

    data.forEach(function (d) {
        var day_array = d.day.split(",");
        var activities = [];
        for (var i = 0; i < day_array.length; i++) {
            // Duration
            if (i % 2 == 1) {
                activities.push({ 'act': day_array[i - 1], 'duration': +day_array[i] });
            }
        }
        sched_objs.push(activities);
    });

    // Used for percentages by minute
    var act_counts = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0, "11": 0, "12": 0, "13": 0, "14": 0, "15": 0, "16": 0 };

    // A node for each person's schedule
    var nodes = sched_objs.map(function (o, i) {
        // console.log(o)
        var act = o[0].act;
        act_counts[act] += 1;
        var init_x = foci[act].x + Math.random();
        var init_y = foci[act].y + Math.random();
        return {
            act: act,
            radius: 3,
            x: init_x,
            y: init_y,
            color: color(act),
            moves: 0,
            next_move_time: o[0].duration,
            sched: o,
        }
    });

    var force = d3.layout.force()
        .nodes(nodes)
        .size([width, height])
        .gravity(0)
        .charge(0)
        .friction(.9)
        .on("tick", tick)
        .start();

    var circle = svg.selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", function (d) { return d.radius; })
        .style("fill", function (d) { return d.color; });
    // .call(force.drag);

    // Activity labels
    var label = svg.selectAll("text")
        .data(act_codes)
        .enter().append("text")
        .attr("class", "actlabel")
        .attr("x", function (d, i) {
            return d.locX

        })
        .attr("y", function (d, i) {
            return d.locY
        });

    label.append("tspan")
        .attr("x", function () { return d3.select(this.parentNode).attr("x"); })
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d.short;
        });
    label.append("tspan")
        .attr("dy", "1.3em")
        .attr("x", function () { return d3.select(this.parentNode).attr("x"); })
        .attr("text-anchor", "middle")
        .attr("class", "actpct")
        .text(function (d) {
            return act_counts[d.index] + "%";
        });


    // Update nodes based on activity and duration
    function timer() {
        d3.range(nodes.length).map(function (i) {
            var curr_node = nodes[i],
                curr_moves = curr_node.moves;

            // Time to go to next activity
            if (curr_node.next_move_time == curr_minute) {
                if (curr_node.moves == curr_node.sched.length - 1) {
                    curr_moves = 0;
                } else {
                    curr_moves += 1;
                }

                // Subtract from current activity count
                act_counts[curr_node.act] -= 1;

                // Move on to next activity
                curr_node.act = curr_node.sched[curr_moves].act;

                // Add to new activity count
                act_counts[curr_node.act] += 1;

                curr_node.moves = curr_moves;
                curr_node.cx = foci[curr_node.act].x;
                curr_node.cy = foci[curr_node.act].y;

                nodes[i].next_move_time += nodes[i].sched[curr_node.moves].duration;
            }

        });

        force.resume();
        curr_minute += 1;

        // Update percentages
        label.selectAll("tspan.actpct")
            .text(function (d) {
                return readablePercent(act_counts[d.index]);
            });

        // Update time
        var true_minute = curr_minute % 1440;
        d3.select("#current_time").text(minutesToTime(true_minute));

        setTimeout(timer, speeds[USER_SPEED]);
    }
    setTimeout(timer, speeds[USER_SPEED]);




    function tick(e) {
        var k = 0.04 * e.alpha;

        // Push nodes toward their designated focus.
        nodes.forEach(function (o, i) {
            var curr_act = o.act;

            // Make sleep more sluggish moving.
            if (curr_act == "0") {
                var damper = 0.6;
            } else {
                var damper = 1;
            }
            o.color = color(curr_act);
            o.y += (foci[curr_act].y - o.y) * k * damper;
            o.x += (foci[curr_act].x - o.x) * k * damper;
        });

        circle
            .each(collide(.5))
            .style("fill", function (d) { return d.color; })
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; });
    }


    // Resolve collisions between nodes.
    function collide(alpha) {
        var quadtree = d3.geom.quadtree(nodes);
        return function (d) {
            var r = d.radius + maxRadius + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function (quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + quad.point.radius + (d.act !== quad.point.act) * padding;
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

    // Speed toggle
    d3.selectAll(".togglebutton")
        .on("click", function () {
            if (d3.select(this).attr("data-val") == "slow") {
                d3.select(".slow").classed("current", true);
                d3.select(".medium").classed("current", false);
                d3.select(".fast").classed("current", false);
            } else if (d3.select(this).attr("data-val") == "medium") {
                d3.select(".slow").classed("current", false);
                d3.select(".medium").classed("current", true);
                d3.select(".fast").classed("current", false);
            }
            else {
                d3.select(".slow").classed("current", false);
                d3.select(".medium").classed("current", false);
                d3.select(".fast").classed("current", true);
            }

            USER_SPEED = d3.select(this).attr("data-val");
        });
}); // @end d3.tsv



function color(activity) {

    var colorByActivity = {
        "0": "#e0d400",
        "1": "#1c8af9",
        "2": "#51BC05",
        "3": "#FF7F00",
        "4": "#DB32A4",
        "5": "#00CDF8",
        "6": "#E63B60",
        "7": "#8E5649",
        "8": "#68c99e",
        "9": "#a477c8",
        "10": "#5C76EC",
        "11": "#E773C3",
        "12": "#799fd2",
        "13": "#038a6c",
        "14": "#cc87fa",
        "15": "#ee8e76",
        "16": "#bbbbbb",
    }

    return colorByActivity[activity];

}



// Output readable percent based on count.
function readablePercent(n) {

    var pct = 100 * n / 1000;
    if (pct < 1 && pct > 0) {
        pct = "<1%";
    } else {
        pct = Math.round(pct) + "%";
    }

    return pct;
}


// Minutes to time of day. Data is minutes from 4am.
function minutesToTime(m) {
    var minutes = (m + 4 * 60) % 1440;
    var hh = Math.floor(minutes / 60);
    var ampm;
    if (hh > 12) {
        hh = hh - 12;
        ampm = "pm";
    } else if (hh == 12) {
        ampm = "pm";
    } else if (hh == 0) {
        hh = 12;
        ampm = "am";
    } else {
        ampm = "am";
    }
    var mm = minutes % 60;
    if (mm < 10) {
        mm = "0" + mm;
    }

    return hh + ":" + mm + ampm
}