module.exports = {

    matchTemplate: function(config, template, name) {
        let flag = false;
        for(let key in template) {
		    if(typeof config[key] === "undefined") {
			    console.log("[Config] New " + (name ? name : "config") + " key found:", key);
			    config[key] = template[key];
			    flag = true;
		    }	
        }
        return flag;
    }

};