// courtesy of dzaima
function deflate(arr) {
	return pako.deflateRaw(arr, { "level": 9 });
}

function encode(str) {
	let bytes = new TextEncoder("utf-8").encode(str);
	return arrToB64(deflate(bytes));
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
	return response.json()
}
async function TIO(code, input, lang) {
	const encoder = new TextEncoder("utf-8");
	let length = encoder.encode(code).length;
	let iLength = encoder.encode(input).length;
	//  Vlang\u00001\u0000{language}\u0000F.code.tio\u0000{# of bytes in code}\u0000{code}F.input.tio\u0000{length of input}\u0000{input}Vargs\u0000{number of ARGV}{ARGV}\u0000R
	let rBody = "Vlang\x001\x00" + lang + "\x00F.code.tio\x00" + length + "\x00" + code + "F.input.tio\x00" + iLength + "\x00" + input + "Vargs\x000\x00R";
	console.log(rBody)
	rBody = encode(rBody);
	console.log(rBody);
	response = await fetch("https://tio.run/cgi-bin/run/api/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json;charset=utf-8"
		},
		body: rBody
	});
	return response
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
		return TIO(expr, input, lang);
	}
}

window.addEventListener('DOMContentLoaded', (event) => {
	// Globals:
	let sidebar = document.getElementById("sidebar"); //Options menu
	let runner = "tryAPL"; // default runner
	let mode = "dfn"; //default mode
	let tioLang = "apl-dyalog";

	// code input and output
	let code = document.getElementById("code");
	let head = document.getElementById("head");
	let foot = document.getElementById("foot");
	let inp = document.getElementById("input");
	let out = document.getElementById("output");

	// Textarea auto-sizing
	const tx = document.getElementsByTagName('textarea');
	for (let i = 0; i < tx.length; i++) {
		tx[i].setAttribute('style', 'height:' + (tx[i].scrollHeight) + 'px;overflow-y:hidden;');
		tx[i].addEventListener("input", OnInput, false);
	}
	function OnInput() {
		this.style.height = 'auto';
		this.style.height = (this.scrollHeight + 5) + 'px';
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
			let targ = document.getElementById("picker");
			let runner = item.value;
			console.log(runner);
			if (runner === "tryAPL") {
				picker.style.display = "none";
			}
			else if (runner === "tio") {
				picker.style.display = "block";
			}
		});
	});

	// Change language
	document.querySelectorAll(".pick").forEach((item) => {
		item.addEventListener('click', (event) => {
			tioLang = item.value;
			console.log(tioLang);
		});
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

	code.addEventListener("keydown", (event) => {
		document.getElementById("count").innerHTML = code.value.length;
	});

	// run APL code on click
	document.getElementById("run").addEventListener('click', async (event) => {
		let input = inp.value;
		let promise = "";
		if (mode === "dfn") {
			let trans = code.value;
			if (trans.indexOf("\n") + 1) {
				trans = "⋄⎕FX '" + ("run←" + trans.trim()).split("\n").join("' '") + "' ''⋄";
			}
			else { // Make it easier for debugging
				trans = "⋄run←" + trans.trim() + "⋄";
			}
			promise = await executeAPL(head.value, trans, foot.value, runner, tioLang, input);
		}
		else if (mode === "tradfn") {
			if (runner === "tryAPL") {
				promise = await executeAPL(head.value, code.value.trim().replace("\n", "⋄"), foot.value, runner, tioLang, input);
			}
			else {
				promise = await executeAPL(head.value, "\n∇f\n" + code.value.trim() + "\n∇", foot.value, runner, tioLang, input);
			}
		}
		out.innerHTML = promise.join("\n");
	});
});