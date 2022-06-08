window.chart = undefined
window.plotData = undefined
window.indexes = undefined
function sendRequest(url, requestParams, callback){
	xhr = new XMLHttpRequest()
	xhr.open("POST", url, true)
	xhr.onload = function(){
		callback(xhr.response)
	}
	xhr.withcredentials = true
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	params_url = []
	for (key of Object.keys(requestParams)){
		if (Array.isArray(requestParams[key]))
			params_url.push(key + "=[" + requestParams[key] + "]")
		else
			params_url.push(key + "=" + requestParams[key])
	}
	console.log({params_url})
	xhr.send(params_url.join("&"))
}



function createChart(data, name){
	window.plotData = []
	z_data = []
	x_data = []
	y_data = []
	for (x of Object.keys(data)){
		z_data_to_add = []
		x_data_to_add = []
		y_data_to_add = []
		for (y of Object.keys(data[x]))
		{
			x_data_to_add.push(x)
			y_data_to_add.push(y)
			z_data_to_add.push(data[x][y])
		}
		x_data.push(x_data_to_add)
		y_data.push(y_data_to_add)
		z_data.push(z_data_to_add)
	}
	window.plotData.push({
		type : "surface",
		x    : x_data,
		y    : y_data,
		z    : z_data,
		z_title : "yolo"
	})
	window.layout = {
		title:"import et export d'energie par habitant",
		scene : {
			xaxis:{
				title:"Eolien (MWh/an)"
			},
			yaxis:{
				title:"Solaire (MWh/an)"
			},
			zaxis:{
				title: "Import(MWh/an)"
			}
		}
	}
	config = {
		responsive: true
	}
	Plotly.newPlot(name, window.plotData, window.layout, config);
}

function updateChart(data, name, labels = {}){
	z_data = []
	x_data = []
	y_data = []
	for (x of Object.keys(data)){
		z_data_to_add = []
		x_data_to_add = []
		y_data_to_add = []
		for (y of Object.keys(data[x]))
		{
			x_data_to_add.push(x)
			y_data_to_add.push(y)
			z_data_to_add.push(data[x][y])
		}
		x_data.push(x_data_to_add)
		y_data.push(y_data_to_add)
		z_data.push(z_data_to_add)
	}
	window.plotData[0].x = x_data
	window.plotData[0].y = y_data
	window.plotData[0].z = z_data
	if (labels.x_name != undefined)
		window.layout.scene.xaxis.title = x_name
	if (labels.y_name != undefined)
		window.layout.scene.yaxis.title = y_name
	Plotly.redraw(name)
}
function getSelectedElement(name){
	for (elem of document.getElementsByName(name))
		{
			if (elem.checked == true){
				return elem.value
			}
		}
}
function getShortName(index){
	for (elem of Object.keys(window.indexes)){
		if (window.indexes[elem].index == index)
			return window.indexes[elem].short_name
	}
}
function callback(response){
	responseData = JSON.parse(response)
	if (window.plotData == undefined)
		createChart(responseData, "mcanvas")
	else
	{
		first_elem = getSelectedElement("first_index")
		second_elem = getSelectedElement("second_index")
		x_name = getShortName(first_elem)
		y_name = getShortName(second_elem)
		updateChart(responseData, "mcanvas", {x_name, y_name})
	}
}

function actualize(params){
	return function(){
		values = []
		fixed_indexes = []
		fixed_values = []
		for (param of params){
			if (param.valueType == "bool")
			{
				elem = document.getElementById(param.paramName)
				values [param.paramName] = elem.checked
				continue
			}
			if (param.valueType == "radio"){
				elems = document.getElementsByName(param.paramName)
				for (elem of elems)
				{
					if (elem.checked)
					{
						val = elem.value
						values[param.paramName] = elem.value
						selected_elem = null
						
						for (choice of Object.keys(param.choices))
						{
							if (val == param.choices[choice].index)
							{
								values[param.paramName.split("_")[0] + "_scale"] = param.choices[choice].suggested_scale
								break
							}
						}
						break
					}
				}
				continue
			}
			if (param.formType == "select")
			{
				elem = document.getElementById(param.paramName)
				if (param.paramName.startsWith("fixed_index"))
				{
					index = param.paramName.split("_")[param.paramName.split("_").length - 1]
					fixed_indexes.push(index)
					fixed_values.push(elem.value)
				}
				else
				{
					values [param.paramName] = elem.value
				}
				continue
			}
			elem = document.getElementById(param.paramName)
			values [param.paramName] = elem.value
		}
		
		first_index_pos = fixed_indexes.indexOf(values["first_index"])
		if (first_index_pos != -1)
		{
			fixed_indexes.splice(first_index_pos, 1)
			fixed_values.splice(first_index_pos, 1)
		}
		second_index_pos = fixed_indexes.indexOf(values["second_index"])
		if (second_index_pos != -1)
		{
			fixed_indexes.splice(second_index_pos, 1)
			fixed_values.splice(second_index_pos, 1)
		}
		values["fixed_indexes"] = fixed_indexes
		values["fixed_values"]  = fixed_values
		sendRequest("/sims/api/results/data", values, callback )
	}
}

window.addEventListener("load", function(){
	sendRequest("/sims/api/results/index_result", {}, (response)=>{
		results_indexes = JSON.parse(response)
		window.results_indexes = results_indexes
		results_indexes_as_array = []
		for (key of Object.keys(results_indexes))
			results_indexes_as_array.push(results_indexes[key])
		sendRequest("/sims/api/results/index", {}, (response)=>{
			console.log({results_indexes})
			indexes = JSON.parse(response)
			default_data = {
				first_index : indexes.wind_production.index,
				second_index : indexes.solar_production.index,
				 first_scale : indexes.wind_production. suggested_scale,
				second_scale : indexes.solar_production.suggested_scale,
				
			}
			sendRequest("/sims/api/results/data", default_data, callback )
			window.indexes = indexes
			selectParams = []
			for (key of Object.keys(indexes))
				selectParams.push(window.setSelectParam("fixed_index_" + indexes[key].index, indexes[key].short_name, indexes[key].possible_values, indexes[key].suggested_scale))
			window.generateForm("graph", window.GRAPH_3D_DYNAMIC,
			[
				window.setEnumParam("first_index", "premier parametre à faire varier", indexes, defaultValue = 0, formType = "radio"),
				window.setEnumParam("second_index", "second parametre à faire varier", indexes, defaultValue = 1, formType = "radio"),
				...selectParams,
				window.setSelectParam("result_index", "résultat à afficher", results_indexes_as_array, 0.0, 7 )//TODO the one before will be changed
			], actualize)
		})
	})
	
})