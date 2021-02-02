// Following three functions are courtesy of dzaima
function deflate(arr) {
	return pako.deflateRaw(arr, { "level": 9 });
}

function encode(str) {
	let bytes = new TextEncoder("utf-8").encode(str);
	return deflate(bytes);
}

function arrToB64(arr) {
	var bytestr = "";
	arr.forEach(c => bytestr += String.fromCharCode(c));
	return btoa(bytestr).replace(/\+/g, "@").replace(/=+/, "");
}

// From the TryAPL docs
async function tryAPL(state) {
	response = await fetch("https://tryapl.org/Exec", {
		method: "POST",
		headers: {
			"Content-Type": "application/json;charset=utf-8"
		},
		body: JSON.stringify(state)
	})
	return response.json();
}

async function TIO(code, input, lang) {
	const encoder = new TextEncoder("utf-8");
	let length = encoder.encode(code).length;
	let iLength = encoder.encode(input).length;
	//  Vlang\u00001\u0000{language}\u0000F.code.tio\u0000{# of bytes in code}\u0000{code}F.input.tio\u0000{length of input}\u0000{input}Vargs\u0000{number of ARGV}{ARGV}\u0000R
	let rBody = "Vlang\x001\x00" + lang + "\x00F.code.tio\x00" + length + "\x00" + code + "F.input.tio\x00" + iLength + "\x00" + input + "Vargs\x000\x00R";
	rBody = encode(rBody);
	let fetched = await fetch("https://tio.run/cgi-bin/run/api/", {
		method: "POST",
		headers: {
			"Content-Type": "text/plain;charset=utf-8"
		},
		body: rBody
	});
	let read = (await fetched.body.getReader().read()).value;
	let text = new TextDecoder('utf-8').decode(read);
	return text.slice(16).split(text.slice(0, 16));
}



async function executeAPL(head, code, foot, runner, lang, input) {
	let expr = "";
	if (runner === "tryAPL") {
		// spam ⋄ everywhere and hope it works
		head = head.replace("\n", "⋄");
		foot = foot.replace("\n", "⋄");
		expr = [head, code, foot].join("⋄");
		let state = ["", 0, "", expr];
		console.log(state);
		result = await tryAPL(state);
		return result[3];
	}
	else {
		expr = head + "\n" + code + "\n" + foot;
		return await TIO(expr, input, lang);
	}
}

window.addEventListener('DOMContentLoaded', (event) => {
	// Globals:
	const queryString = window.location.search;
	console.log(queryString);
	const urlParams = new URLSearchParams(queryString);
	let sidebar = document.getElementById("sidebar"); //Options menu
	let runner = "tryAPL"; // default runner
	let mode = "dfn"; //default mode
	let tioLang = "apl-dyalog";
	let funcName = "f";

	// code input and output
	let code = document.getElementById("code");
	let head = document.getElementById("head");
	let foot = document.getElementById("foot");
	let inp = document.getElementById("input");
	let out = document.getElementById("output");
	let inpdiv = document.getElementById("inp-div");

	head.value = decodeURIComponent(urlParams.get("h") || "");
	code.value = decodeURIComponent(urlParams.get("c") || "");
	foot.value = decodeURIComponent(urlParams.get("f") || "");
	inp.value = decodeURIComponent(urlParams.get("i") || "");
	runner = decodeURIComponent(urlParams.get("r") || "");
	tioLang = decodeURIComponent(urlParams.get("l") || "");
	mode = decodeURIComponent(urlParams.get("m") || "dfn");
	funcName = decodeURIComponent(urlParams.get("n") || "f");
	document.getElementById("fname").value = funcName;


	// Textarea auto-sizing
	const tx = document.getElementsByTagName('textarea');
	for (let i = 0; i < tx.length; i++) {
		tx[i].setAttribute('style', 'height:' + (tx[i].scrollHeight) + 'px;overflow-y:hidden;');
		tx[i].addEventListener("input", OnInput, false);
	}
	function OnInput() {
		this.style.height = 'auto';
		this.style.height = this.scrollHeight + 'px';
	}

	// Options menu show/hide
	document.getElementById("options").addEventListener('click', (event) => {
		if (sidebar.style.display !== "none") {
			sidebar.style.display = "none";
		}
		else {
			sidebar.style.display = "block";
		}
	});

	// Collapsible blocks
	document.querySelectorAll(".arrow").forEach((item) => {
		item.addEventListener('click', (event) => {
			// Arrows: ∇ ᐅ
			let elem = document.getElementById(item.getAttribute("data-hide"));
			if (elem.style.display !== "none") {
				elem.style.display = "none";
				item.innerHTML = 'ᐅ';
				item.style.fontSize = "1.5rem";

			}
			else {
				elem.style.display = "block";
				item.innerHTML = '∇';
				item.style.fontSize = "2.5rem";
			}
		});
	});

	// Change runner site
	document.querySelectorAll(".runner").forEach((item) => {
		item.addEventListener('click', (event) => {
			runner = item.value;
			console.log(runner);
			if (runner === "tryAPL") {
				picker.style.display = "none";
				inpdiv.style.display = "none";
			}
			else if (runner === "tio") {
				picker.style.display = "block";
				inpdiv.style.display = "block";
				inp.style.height = head.style.height;
			}
		});
	});
	// to remedy autofill
	if (document.getElementById("tryapl").checked) {
		picker.style.display = "none";
		inpdiv.style.display = "none";
		runner = "tryAPL";
	}
	else {
		picker.style.display = "block";
		inpdiv.style.display = "block";
		inp.style.height = head.style.height;
		runner = "tio";
	}

	// Change language
	document.querySelectorAll(".pick").forEach((item) => {
		item.addEventListener('click', (event) => {
			tioLang = item.value;
			console.log(tioLang);
		});
		if (item.selected === "selected") {
			tioLang = item.value;
		}
	});

	// Change submission type
	document.querySelectorAll(".sub").forEach((item) => {
		item.addEventListener('click', (event) => {
			mode = item.value;
			console.log(mode);
			if (mode === "dfn") {
				document.getElementById("mode").innerHTML = "Function";
			}
			else {
				document.getElementById("mode").innerHTML = "Full Program";
			}

		});
	});

	// PRevent autocomplete
	document.querySelectorAll(".no-auto").forEach((item) => {
		item.autocomplete = "off";
	});

	//byte counting
	code.addEventListener("keydown", (event) => {
		document.getElementById("count").innerHTML = code.value.length;
	});

	// Function name
	document.getElementById("fname").onchange = (event) => {
		funcName = document.getElementById("fname").value;
		console.log(funcName);
	};

	document.getElementById("postify").addEventListener('click', (event) => {
		let e = (x) => decodeURIComponent(x);
		let link = encodeURI(location.protocol + '//' + location.host + location.pathname + "?h=" + e(head.value) + "&c=" + e(code.value) + "&f=" + e(foot.value) + "&i=" + e(inp.value) + "&r=" + e(runner) + "&l=" + e(tioLang) + "&m=" + e(mode) + "&n=" + e(funcName));
		console.log(link);
		history.pushState({}, null, link);
		let postLang = "Dyalog Unicode";
		let postLink = "https://dyalog.com";
		if (runner === "tio") {
			switch (tioLang) {
				case "apl-dyalog":
					postLang = "Dyalog Unicode";
					postLink = "https://dyalog.com";
					break;
				case "apl-dyalog-extended":
					postLang = "Dyalog Extended";
					postLink = "https://github.com/abrudz/dyalog-apl-extended";
					break;
				case "apl-dzaima":
					postLang = "dzaima/APL";
					postLink = "https://github.com/dzaima/APL/";
					break;
			}
		}

		let post = `# [APL(${postLang})][1], <sup><s></s></sup>${document.getElementById("count").innerHTML} bytes <sup>[SBCS][2]</sup>
\`\`\`
${code.value}
\`\`\`
[Try it on golfAPL!](${window.location.href})

A ${mode} submission which ____.

[1]: ${postLink}
[2]: https://github.com/abrudz/SBCS
`;
		out.innerText = post;
	});

	document.getElementById("cmcify").addEventListener('click', (event) => {
		let e = (x) => decodeURIComponent(x);
		let link = encodeURI(location.protocol + '//' + location.host + location.pathname + "?h=" + e(head.value) + "&c=" + e(code.value) + "&f=" + e(foot.value) + "&i=" + e(inp.value) + "&r=" + e(runner) + "&l=" + e(tioLang) + "&m=" + e(mode) + "&n=" + e(funcName));
		console.log(link);
		history.pushState({}, null, link);
		out.innerText = `[APL, ${document.getElementById("count").innerHTML} bytes](${window.location.href})`;
	})

	// run APL code on click
	document.getElementById("run").addEventListener('click', async (event) => {
		document.getElementById("run").innerHTML = "Running";
		document
		let input = inp.value;
		let promise = "";
		if (mode === "dfn") {
			let trans = code.value;
			if (trans.indexOf("\n") + 1) {
				trans = "⋄⎕FX '" + (funcName + "←" + trans.trim()).split("\n").join("' '") + "' ''⋄";
			}
			else { // Make it easier for debugging
				sep = (runner === "tryAPL") ? '⋄' : '\n';
				trans = sep + funcName + "←" + trans.trim() + sep;
			}
			promise = await executeAPL(head.value, trans, foot.value, runner, tioLang, input);
		}
		else if (mode === "tradfn") {
			if (runner === "tryAPL") {
				promise = await executeAPL(head.value, code.value.trim().replace("\n", "⋄"), foot.value, runner, tioLang, input);
			}
			else {
				promise = await executeAPL(head.value, "\n∇" + funcName + "\n" + code.value.trim() + "\n∇", foot.value, runner, tioLang, input);
			}
		}
		out.innerHTML = promise.join("\n");
	});
});