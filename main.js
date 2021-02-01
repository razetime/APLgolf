
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
	const encoder = new TextEncoder();
	let length = encoder.encode(state.code).length;
	response = await fetch("https://tio.run/cgi-bin/run/api/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json;charset=utf-8"
		},
		body: "Vlang\x001\x00" + lang + "\x00F.code.tio\x00" + length + "\x00" + code + "F.input.tio" + input + "Vargs\x000\x00R"
	})
	return response.json()
}

async function executeAPL(head, code, foot, runner, lang, input) {
	if (runner === "tryAPL") {
		head = head.replace("\n", "⋄");
		foot = foot.replace("\n", "⋄");
		expr = head + code + foot;
		let state = ["", 0, "", expr];
		console.log(state);
		result = await tryAPL(state);
		return result[3];
	}
	else {
		return TIO(expr, input, lang);
	}
}

window.addEventListener('DOMContentLoaded', (event) => {
	// Globals:
	let sidebar = document.getElementById("sidebar"); //Options menu
	let runner = "tio"; // default runner
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

	// run APL code on click
	document.getElementById("run").addEventListener('click', async (event) => {
		let input = inp.value;
		let promise = "";
		if (mode === "dfn") {
			promise = await executeAPL(head.value, "⋄⎕FX '" + ("run←" + code.value.trim()).split("\n").join("' '") + "' ''⋄", foot.value, runner, tioLang, input);
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