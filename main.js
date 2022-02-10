// Following five functions are courtesy of dzaima
function deflate(arr) {
    return pako.deflateRaw(arr, {
        "level": 9
    });
}

function inflate(arr) {
    return pako.inflateRaw(arr);
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

function b64ToArr(str) {
    return new Uint8Array([...atob(decodeURIComponent(str).replace(/@/g, "+"))].map(c => c.charCodeAt()))
}

function cToClip(str) {
    navigator.clipboard.writeText(str);
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

// more help from dzaima here
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
    if (runner === "tryapl") {
        // spam ⋄ everywhere and hope it works
        head = head.replaceAll("\n", "⋄");
        foot = foot.replaceAll("\n", "⋄");
        expr = [head, code, foot].join('⋄').replace(/⍝[^']*?⋄/g,'⋄');
        console.log(expr);
        let state = ["", 0, "", expr];
        console.log(state);
        result = await tryAPL(state);
        return result[3];
    } else {
        expr = head + "\n" + code + "\n" + foot;
        return await TIO(expr, input, lang);
    }
}


// main program
window.addEventListener('DOMContentLoaded', (event) => {
    // Globals:
    const queryString = window.location.search;
    console.log(queryString);
    const urlParams = new URLSearchParams(queryString);
    let sidebar = document.getElementById("sidebar"); //Options menu
    let runner = "tryapl"; // default runner
    let mode = "dfn"; //default mode
    let tioLang = "apl-dyalog";
    let funcName = "f";
    let eType = "single";

    // code input and output
    let code = document.getElementById("code");
    let head = document.getElementById("head");
    let foot = document.getElementById("foot");
    let inp = document.getElementById("input");
    let out = document.getElementById("output");
    let inpdiv = document.getElementById("inp-div");
    let explain = document.getElementById("explain");

    function errorCheckRunner(runner) {
        if (runner === "tryAPL") { runner = "tryapl"; }
        if (runner !== "tryapl" && runner !== "tio") {
            console.error("The link has runner set to '" + runner + "'. Must be one of 'tryapl' or 'tio'. It defaulted to 'tryapl'.")
            runner = "tryapl";
        }
        return runner;
    }

    // prefill items
    let d = x => decodeURIComponent(x);
    let cd = x => new TextDecoder("utf-8").decode(inflate(b64ToArr(d(x))));
    head.value = cd(urlParams.get("h") || "");
    code.value = cd(urlParams.get("c") || "");
    foot.value = cd(urlParams.get("f") || "");
    inp.value = cd(urlParams.get("i") || "");
    runner = d(urlParams.get("r") || "tryapl");
    runner = errorCheckRunner(runner);
    tioLang = d(urlParams.get("l") || "apl-dyalog");
    mode = d(urlParams.get("m") || "dfn");
    if(mode == "train"){
      document.getElementById("mode").innerHTML = "tacit function";
    } else if (mode == "dfn") {
        document.getElementById("mode").innerHTML = "dfn";
    } else if (mode == "tradfn") {
        document.getElementById("mode").innerHTML = "full program";
    } else {
        document.getElementById("output").style.color = "red";
        document.getElementById("output").innerHTML = "URL does not contain a valid mode.";
    }
    funcName = d(urlParams.get("n") || "f");
    document.getElementById("fname").value = funcName;
    document.getElementById("count").innerHTML = code.value.length;
    document.getElementById(runner).checked = true;
    if (runner === "tio") {
        console.log(runner);

        inpdiv.style.display = "block";
    }
    let cCode = CodeMirror.fromTextArea(code, {
        theme: "material",
        viewportMargin: Infinity,
        value: code.value
    });
    let cHead = CodeMirror.fromTextArea(head, {
        theme: "material",
        viewportMargin: Infinity,
        value: head.value
    });
    let cFoot = CodeMirror.fromTextArea(foot, {
        theme: "material",
        viewportMargin: Infinity,
        value: head.value
    });
    let cInput = CodeMirror.fromTextArea(inp, {
        theme: "material",
        viewportMargin: Infinity,
        value: inp.value
    });

    let chs = "^⌹⍳⍴!%*+,-<=>?|~⊢⊣⌷≤≥≠∨∧÷×∊↑↓○⌈⌊⊂⊃∩∪⊥⊤⍱⍲⍒⍋⍉⌽⊖⍟⍕⍎⍪≡≢⍷⍸⊆⊇⍧⍮√ϼ…¨⍨⌸⍁⍩ᑈᐵ⌶/\\&.@∘⌺⍫⍣⍢⍤⍛⍡⍥⍠⎕⍞∆⍙ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789¯∞⍬#⍺⍵⍶⍹∇{}:";
    cCode.on("change", e => {
        cCode.save();
        let length = code.value.length;
        // let r = code.value;
        // for (let i = 0; i < r.length; i++) {
        // 	let x = r[i];
        // 	if (chs.indexOf(x) + 1) {
        // 		length += 1;
        // 	}
        // 	else {
        // 		let a = new TextEncoder("utf-8").encode(x);
        // 		length += a.length;
        // 	}
        // }

        document.getElementById("count").innerHTML = length;
    });

    cHead.on("change", e => {
        cHead.save();
    });

    cFoot.on("change", e => {
        cFoot.save();
    });

    cInput.on("change", e => {
        cInput.save();
    });

    // Textarea auto-sizing
    // const tx = document.getElementsByTagName('textarea');
    // for (let i = 0; i < tx.length; i++) {
    // 	tx[i].setAttribute('style', 'height:' + (tx[i].scrollHeight) + 'px;overflow-y:hidden;');
    // 	tx[i].addEventListener("input", OnInput, false);
    // }
    // function OnInput() {
    // 	this.style.height = 'auto';
    // 	this.style.height = this.scrollHeight + 'px';
    // }

    // Options menu show/hide
    document.getElementById("options").addEventListener('click', (event) => {
        if (sidebar.style.display !== "none") {
            sidebar.style.display = "none";
        } else {
            sidebar.style.display = "block";
        }
    });

    // Collapsible blocks
    document.querySelectorAll(".arrow").forEach((item) => {
        item.addEventListener('click', (event) => {
            // Arrows: ∇ ᐅ
            let elems = document.getElementById(item.getAttribute("data-hide")).parentNode;
            elems.querySelectorAll('.CodeMirror').forEach(elem => {
                if (elem.style.display !== "none") {
                    elem.style.display = "none";
                    item.innerHTML = 'ᐅ';
                    item.style.fontSize = "1.5rem";

                } else {
                    elem.style.display = "block";
                    item.innerHTML = '∇';
                    item.style.fontSize = "2.5rem";
                }
            });

        });
    });

    // Change runner site
    document.querySelectorAll(".runner").forEach((item) => {
        item.addEventListener('click', (event) => {
            runner = item.id;
            console.log(runner);
            if (runner === "tryapl") {
                picker.style.display = "none";
                inpdiv.style.display = "none";
            } else if (runner === "tio") {
                picker.style.display = "block";
                inpdiv.style.display = "block";
                inp.style.height = head.style.height;
            }
        });
    });

    //
    document.getElementById("explain-or-no").addEventListener('click', (event) => {

        if (explain.style.display === "none") {
            explain.style.display = "block";
        } else {
            explain.style.display = "none";
        }
    });


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
                document.getElementById("mode").innerHTML = "dfn";
            } else if (mode === "tradfn") {
                document.getElementById("mode").innerHTML = "full program";
            } else {
                document.getElementById("mode").innerHTML = "tacit function";
            }

        });
    });

    // PRevent autocomplete
    document.querySelectorAll(".no-auto").forEach((item) => {
        item.autocomplete = "off";
    });

    //byte counting
    // code.oninput = (event) => {
    // 	document.getElementById("count").innerHTML = code.value.length;
    // };

    // Function name
    document.getElementById("fname").oninput = (event) => {
        funcName = document.getElementById("fname").value;
        console.log(funcName);
    };

    document.getElementById("postify").addEventListener('click', (event) => {
        let e = (x) => decodeURIComponent(x);
        let ce = (x) => arrToB64(deflate(e(x)));
        let link = encodeURI(location.protocol + '//' + location.host + location.pathname + "?h=" + ce(head.value) + "&c=" + ce(code.value) + "&f=" + ce(foot.value) + "&i=" + ce(inp.value) + "&r=" + e(runner) + "&l=" + e(tioLang) + "&m=" + e(mode) + "&n=" + e(funcName));
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
[Try it on APLgolf!](${window.location.href})

[1]: ${postLink}
[2]: https://github.com/abrudz/SBCS

A ${document.getElementById("mode").innerHTML} which ____.
`;
        if (document.getElementById("explain-or-no").checked) {
            let indices = [];
            let codeText = code.value;
            codeText = codeText.slice(1, codeText.length - 1);
            if (mode === "dfn") {
                codeText = ' ' + codeText + ' ';
            }

            var re = /('.+'|[A-Za-z0-9\[\] ]+←*|\n)|[^\1]/g;
            while ((match = re.exec(codeText)) != null) {
                indices.push(match.index);
            }
            indices.push(codeText.length);
            let expln = [];
            let block = document.getElementById("single").checked;
            for (let i = indices.length - 1; i >= 0; i--) {
                let curr = codeText.slice(indices[i - 1], indices[i]);
                if (block) {
                    curr = ' '.repeat(indices[i - 1]) + curr;
                    curr = curr.padEnd(codeText.length);
                }
                if (curr.split('').every(x => x === ' ')) {
                    continue;
                }
                expln.push(curr);
            }
            if (block) {
                expln = "```\n" + expln.join('\n') + "\n```";
            } else {
                expln = expln.map(x => '`' + x + '` ');
                expln = expln.join("\n\n");
            }
            post = post + "\n## Explanation\n\n" + expln;
        }
        out.innerText = post;
        document.getElementById("postify").innerText = "Copied!";
        setTimeout(()=>document.getElementById("postify").innerText = "Postify", 1000);
        cToClip(post);
    });

    document.getElementById("cmcify").addEventListener('click', (event) => {
        let e = (x) => d(x);
        let ce = (x) => arrToB64(deflate(e(x)));
        let link = encodeURI(location.protocol + '//' + location.host + location.pathname + "?h=" + ce(head.value) + "&c=" + ce(code.value) + "&f=" + ce(foot.value) + "&i=" + ce(inp.value) + "&r=" + e(runner) + "&l=" + e(tioLang) + "&m=" + e(mode) + "&n=" + e(funcName));
        console.log(link);
        history.pushState({}, null, link);
        out.innerText = `APL, [${document.getElementById("count").innerHTML} bytes](${window.location.href}): \`${code.value}\``;
        document.getElementById("cmcify").innerText = "Copied!";
        setTimeout(()=>document.getElementById("cmcify").innerText = "CMCify", 1000);
        cToClip(out.innerText);
    })

    let runBtn = document.getElementById("run");
    // run APL code on click
    runBtn.addEventListener('click', async (event) => {
        runBtn.innerHTML = "Running";
        runBtn.style.cursor = "wait";
        runBtn.style.pointerEvents = "none";
        document
        let input = inp.value;
        let promise = "";
        if (mode === "dfn") {
            let trans = code.value;
            if (trans.indexOf("\n") + 1) {
                trans = "⋄⎕FX '" + (funcName + "←" + trans.trim().replaceAll("'","''")).split("\n").join("' '") + "' ''⋄";
            } else { // Make it easier for debugging
                sep = (runner === "tryapl") ? '⋄' : '\n';
                trans = sep + funcName + "←" + trans.trim() + sep;
            }
            promise = await executeAPL(head.value, trans, foot.value, runner, tioLang, input);
        } else if (mode === "tradfn") {

            if (runner === "tryapl") {
                promise = await executeAPL(head.value, code.value.trim().replace("\n", "⋄"), foot.value, runner, tioLang, input);
            } else {
                promise = await executeAPL(head.value, "\n∇" + funcName + "\n" + code.value.trim() + "\n∇", foot.value, runner, tioLang, input);
            }
        } else if (mode === "train") {
            if (runner === "tryapl") {
                promise = await executeAPL(head.value, '⋄' + funcName + '←' + code.value + '⋄', foot.value, runner, tioLang, input);
            } else {
                promise = await executeAPL(head.value, '\n' + funcName + '←' + code.value + '\n', foot.value, runner, tioLang, input);
            }
        }
        if (runner === "tio") {
            console.log(promise, mode);
            promise = [promise[0], (promise[1] || "").split("\n").slice(0, -5).join("\n")];
        }

        out.innerHTML = promise.join("\n");
        runBtn.innerHTML = "Run";
        runBtn.style.cursor = "pointer";
        runBtn.style.pointerEvents = "auto";
    });
});
