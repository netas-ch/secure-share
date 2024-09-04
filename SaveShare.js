export class SaveShare {
    #files = [];
    #iv;
    #key;

    constructor() {
        document.getElementById('fileInput').addEventListener('change', this.#onFileInputChange.bind(this));
        document.getElementById('upload').addEventListener('click', this.#onUploadClick.bind(this));
        document.getElementsByName('openings')[0].addEventListener('input', this.#onOpeningsChange.bind(this));
        document.getElementsByName('days')[0].addEventListener('input', this.#onDaysChange.bind(this));

        if (location.hash && location.hash.length > 1) {
            this.#initDecodingGui();
        } else {
            this.openings = 1;
            this.days = 7;
        }
    }

    get textContent() {
        return document.getElementById('textcontent').value;
    }

    set textContent(val) {
        document.getElementById('textcontent').value = val;
    }

    get openings() {
        return parseInt(document.getElementsByName('openings')[0].value);
    }

    set openings(val) {
        document.getElementsByName('openings')[0].value = val;
    }

    get days() {
        return parseInt(document.getElementsByName('days')[0].value);
    }

    set days(val) {
        document.getElementsByName('days')[0].value = val;
    }

    get type() {
        return document.querySelector('input[name="type"]:checked').value;
    }

    async #initDecodingGui() {
        try {
            this.#removeInputFromGui();

            const hashValues = this.#decodeHash();
            const encryptedBlob = await this.#getEncryptedData(hashValues.file);

            // code nötig?
            let code = null;
            if (hashValues && hashValues.codeLength > 0) {
                code = await this.#queryCode(hashValues.codeLength);
            }

            await this.#setIvAndKey(hashValues, code);

            const fileOpts = await this.#decryptFile(encryptedBlob);

            await this.#addDownloadActions(fileOpts);

        } catch (e) {
            if (e instanceof Error && e.message && e.message.indexOf('operation failed') === -1) {
                await this.#showMsg('Fehler', e.message, 'Schliessen');
                location.href = 'https://www.netas.ch';
            } else {
                await this.#showMsg('Fehler', 'Die Daten konnten nicht entschlüsselt werden.', 'Erneut versuchen');
                this.#initDecodingGui();
            }
        }
    }

    async #showMsg(title, msg, buttonText) {
        return new Promise((resolve) => {

            const diag = document.createElement('dialog');
            diag.className = 'user-msg';
            let html = '';
            html += '<h4>' + title + '</h4>';
            html += '<div>' + msg + '</div>';
            html += '<button class="open">' + buttonText + '</button>';
            diag.innerHTML = html;

            document.body.appendChild(diag);
            diag.showModal();
            diag.querySelector('button.open').addEventListener('click', () => {
                resolve();
                diag.close();
                diag.parentNode.removeChild(diag);
            });
        });
    }

    async #addDownloadActions(fileOpts) {
        const container = document.body.querySelector('div.container-inner');
        document.getElementById('textcontent').style.display = null;

        let helpText = '';

        if (fileOpts.openings === 0) {
            if (this.textContent && this.#files.length > 0) {
                helpText += 'Folgender Text und Dateien wurden übermittelt. <b>Kopieren Sie den Text und Speichern Sie die Dateien ab, diese stehen nur jetzt zur Verfügung und wurden auf dem Server gelöscht!</b>';

            } else if (this.textContent) {
                helpText += 'Folgender Text wurden übermittelt. <b>Kopieren Sie den Text, dieser steht nur jetzt zur Verfügung und wurde auf dem Server gelöscht!</b>';

            } else if (this.#files.length === 1) {
                helpText += 'Folgende Datei wurde übermittelt. <b>Speichern Sie die Datei sofort ab, diese steht nur jetzt zur Verfügung und wurde auf dem Server gelöscht!</b>';

            } else if (this.#files.length > 0) {
                helpText += 'Folgende Dateien wurden übermittelt. <b>Speichern Sie die Dateien sofort ab, diese stehen nur jetzt zur Verfügung und wurden auf dem Server gelöscht!</b>';
            }
        } else if (fileOpts.openings > 20) {
            if (this.textContent && this.#files.length > 0) {
                helpText += 'Folgender Text und Dateien wurden übermittelt. <b>Kopieren Sie den Text und Speichern Sie die Dateien ab.</b>';

            } else if (this.textContent) {
                helpText += 'Folgender Text wurden übermittelt. <b>Kopieren Sie den Text.</b>';

            } else if (this.#files.length === 1) {
                helpText += 'Folgende Datei wurde übermittelt. <b>Bitte speichern Sie die Datei ab.</b>';

            } else if (this.#files.length > 0) {
                helpText += 'Folgende Dateien wurden übermittelt. <b>Bitte speichern Sie die Dateien ab.</b>';
            }
        } else {
            if (this.textContent && this.#files.length > 0) {
                helpText += `Folgender Text und Dateien wurden übermittelt. <b>Kopieren Sie den Text und Speichern Sie die Dateien ab, der Link kann noch ${fileOpts.openings}x geöffnet werden.</b>`;

            } else if (this.textContent) {
                helpText += `Folgender Text wurden übermittelt. <b>Kopieren Sie den Text, der Link kann noch ${fileOpts.openings}x geöffnet werden.</b>`;

            } else if (this.#files.length === 1) {
                helpText += `Folgende Datei wurde übermittelt. <b>Speichern Sie die Datei sofort ab, der Link kann noch ${fileOpts.openings}x geöffnet werden.</b>`;

            } else if (this.#files.length > 0) {
                helpText += `Folgende Dateien wurden übermittelt. <b>Speichern Sie die Dateien sofort ab, der Link kann noch ${fileOpts.openings}x geöffnet werden.</b>`;
            }
        }


        const helpEl = document.createElement('p');
        helpEl.className = 'infotext';
        helpEl.innerHTML = helpText + '';
        container.insertBefore(helpEl, document.getElementById('textcontent'));


        if (this.textContent) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copytoclipboard';
            copyBtn.textContent = 'In die Zwischenablage kopieren';
            container.appendChild(copyBtn);
            copyBtn.addEventListener('click', e => {
                navigator.clipboard.writeText(this.textContent);
            });
        } else {
            document.getElementById('textcontent').style.display = 'none';
        }

        if (this.#files && this.#files.length > 0) {

            const helpEl = document.createElement('div');
            helpEl.className = 'infotext';
            helpEl.innerHTML = 'Dateien:';
            container.appendChild(helpEl);

            const fileContainer = document.createElement('div');
            fileContainer.className = 'download-file-container';

            this.#files.forEach((file) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(file);
                link.textContent = '💾 ' + file.name;
                link.setAttribute('download', file.name);
                fileContainer.appendChild(link);
            });

            container.appendChild(fileContainer);
        }
    }

    async #setIvAndKey(hashValues, code) {
        let iv = hashValues.iv;
        if (code) {
            iv += code;
        }
        this.#iv = new Uint8Array(parseInt(hashValues.ivl, 16));
        const dv = new DataView(this.#iv.buffer);
        for (let i = 0; i < iv.length; i += 2) {
            dv.setUint8(i / 2, parseInt(iv.substring(i, i + 2), 16));
        }

        // key
        this.#key = await crypto.subtle.importKey('raw', this.#base64ToArrayBuffer(hashValues.key), {name: 'aes-gcm'}, false, ['decrypt']);
    }

    async #getEncryptedData(id) {
        const req = await fetch('data.php?id=' + decodeURIComponent(id));
        if (req.status === 404) {
            throw new Error('Die Daten sind nicht mehr verfügbar. Wenden Sie sich an den Absender.');
        }
        return await req.blob();
    }


    #queryCode(codeLength) {
        return new Promise((resolve, reject) => {

            const diag = document.createElement('dialog');
            diag.className = 'usercode';
            let html = '<h4>Code</h4>';
            html += '<div>Bitte geben Sie den separat erhaltenen Code ein, um die Daten zu entschlüsseln:</div>';
            html += '<div><input type="text" /></div>';
            html += '<button class="open">Öffnen</button>';
            diag.innerHTML = html;

            document.body.appendChild(diag);
            diag.showModal();
            diag.querySelector('button.open').addEventListener('click', () => {
                const fld = diag.querySelector('input');
                let code = fld.value, errorMsg = '';

                code = code.replace(/[^0-9a-f\-]/ig, '%');
                if (code.indexOf('%') !== -1) {
                    // error
                    errorMsg = 'Der Code ist ungültig';
                }

                if (!errorMsg) {
                    code = code.toUpperCase().replace(/[^0-9a-f]/ig, '');
                    if (code.length !== (codeLength * 2)) {
                        errorMsg = 'Der Code ist ungültig';
                    }
                }

                fld.setCustomValidity(errorMsg);
                if (!errorMsg) {
                    diag.close();
                    document.body.removeChild(diag);
                    resolve(code);
                }
            });
        });
    }

    async #createUrl(fileId) {

        // base url
        let url = location.origin + location.pathname + '?i=' + Date.now().toString(36)
        url += '#' + fileId + '-';

        // add key
        url += this.#arrayBufferToBase64(await crypto.subtle.exportKey('raw', this.#key));

        // add iv
        url += '-';
        const length = this.type === 'url+code' ? this.#iv.length - 3 : this.#iv.length;
        for (let i = 0; i < length; i++) {
            url += this.#iv[i].toString(16).padStart(2, '0');
        }
        url += '' + this.#iv.length.toString(16).padStart(2, '0');

        // generate code
        let code = null;
        if (this.#iv.length !== length) {
            code = '';
            for (let i = length; i < this.#iv.length; i++) {
                if (code !== '') {
                    code += '-';
                }
                code += this.#iv[i].toString(16).padStart(2, '0').toUpperCase();
            }
        }

        return {url, code};
    }

    #removeInputFromGui() {
        const keepClasses = ['logo', 'textcontent', 'footer'], container = document.querySelector('div.container-inner');
        let nodeToRemove = 1;

        while (nodeToRemove) {
            nodeToRemove = null;
            for (let i = 0; i < container.children.length; i++) {
                const node = container.children[i];
                let hasClass = false;

                keepClasses.forEach(cls => {
                    if (node.classList.contains(cls)) {
                        hasClass = true;
                    }
                });

                if (!hasClass) {
                    nodeToRemove = node;
                    break;
                }

            }
            if (nodeToRemove) {
                container.removeChild(nodeToRemove);
            }
        }

        // Textfeld read only
        document.getElementById('textcontent').readOnly = true;
        document.getElementById('textcontent').style.display = 'none';

    }

    async #buildEncryptedFile() {
        const json = {
            version: 1, text: this.textContent, files: []
        };

        for (let i = 0; i < this.#files.length; i++) {
            json.files.push({
                name: this.#files[i].name,
                size: this.#files[i].size,
                type: this.#files[i].type,
                lastModified: this.#files[i].lastModified
            });
        }

        // put json in a uint8array
        const uintarr = (new TextEncoder()).encode(JSON.stringify(json));

        // first 4 bytes are the length of the json
        const lengthArr = new Uint32Array(1);
        new DataView(lengthArr.buffer).setUint32(0, uintarr.buffer.byteLength, true);

        const parts = [lengthArr, uintarr];
        for (let i = 0; i < this.#files.length; i++) {
            parts.push(this.#files[i]);
        }
        const fullfile = new Blob(parts);

        // generate 12 byte IV
        this.#iv = crypto.getRandomValues(new Uint8Array(12));

        // generate 256-bit key
        this.#key = await crypto.subtle.generateKey({name: 'aes-gcm', length: 256}, true, ['encrypt', 'decrypt']);

        // encrypt
        const buf = await crypto.subtle.encrypt({
            name: 'aes-gcm', iv: this.#iv
        }, this.#key, await fullfile.arrayBuffer());

        // first 2 bytes are openings and delete after days
        const fileHandling = new Uint8Array(10);
        new DataView(fileHandling.buffer).setUint8(0, this.openings > 20 ? 0xFF : this.openings - 1);
        new DataView(fileHandling.buffer).setUint8(1, this.days);

        // return as Blob
        return new Blob([fileHandling, buf]);
    }

    async #decryptFile(blob) {

        // buffer
        const abuf = await blob.arrayBuffer();

        // sizes
        const hdrBuf = abuf.slice(0, 10);
        const hdrVw = new DataView(hdrBuf);
        const openings = hdrVw.getUint8(0), days = hdrVw.getUint8(1);

        // decrypted buffer
        const buf = await crypto.subtle.decrypt({
            name: 'aes-gcm', iv: this.#iv
        }, this.#key, abuf.slice(10));

        const jsonLength = new DataView(buf).getUint32(0, true);
        const jsonBuf = buf.slice(4, jsonLength + 4);
        const jsonStr = (new TextDecoder()).decode(jsonBuf);
        const data = JSON.parse(jsonStr);

        if (!data || !data.version) {
            throw new Error('Die Daten konnten nicht entschlüsselt werden.');
        }

        this.textContent = data.text;
        if (data.files && data.files.length > 0) {
            let byteOffset = 4 + jsonLength;

            for (let i = 0; i < data.files.length; i++) {
                const fileBuf = buf.slice(byteOffset, byteOffset + data.files[i].size);
                byteOffset += data.files[i].size;

                if (fileBuf.byteLength !== data.files[i].size) {
                    throw new Error(`invalid file size: ${fileBuf.byteLength} / ${data.files[i].size}`);
                }

                this.#files.push(new File([fileBuf], data.files[i].name, {
                    type: data.files[i].type, lastModified: data.files[i].lastModified
                }));
            }
        }

        return {days, openings};
    }

    #decodeHash() {
        if (location.hash) {
            const m = location.hash.match(/^#(?<file>[^\-]+)\-(?<key>.+)\-(?<iv>[a-f0-9]+)(?<ivl>[a-f0-9]{2})$/);
            if (m && m.groups) {
                return Object.assign(m.groups, {
                    codeLength: parseInt(m.groups.ivl, 16) - (m.groups.iv.length / 2)
                });
            }
        }
    }

    #arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);

        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    #base64ToArrayBuffer(base64Url) {
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

        // Add padding if necessary
        const padding = base64.length % 4;
        if (padding === 2) {
            base64 += '==';
        } else if (padding === 3) {
            base64 += '=';
        }

        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    }

    async #getBearer() {
        const rep = await fetch('data.php?accessKey=1');
        const json = await rep.json();
        if (json && json.accessKey) {
            return json.accessKey;
        }
        throw new Error('invalid access key');
    }

    #uploadFile(file) {
        return new Promise(async (resolve, reject) => {
            try {
                const xhr = new XMLHttpRequest();

                xhr.open('PUT', 'data.php', true);
                xhr.setRequestHeader("Authorization", "Bearer " + await this.#getBearer());

                // Define what happens on successful data submission
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.responseText); // Resolve with the response text
                    } else {
                        reject(new Error(`Status: ${xhr.status} (` + xhr.responseText + ')'));
                    }
                };

                // Define what happens in case of error
                xhr.onerror = () => {
                    reject(new Error("Network error"));
                };

                // Send the file via PUT request
                xhr.send(file);
            } catch (e) {
                reject(e);
            }
        });
    }


    // ---------------------------
    // EVENTS
    // ---------------------------

    #onFileInputChange(e) {
        const fileDisplay = document.getElementById('fileDisplay');
        Array.from(e.target.files).forEach((file, ix) => {
            const fileBox = document.createElement('div');
            const label = document.createElement('span'), close = document.createElement('span');
            close.className = 'close';
            fileBox.className = 'file-box';
            label.textContent = file.name;
            close.textContent = '×';
            fileBox.appendChild(label);
            fileBox.appendChild(close);
            fileBox.id = Date.now().toString(36) + '-' + ix;
            fileDisplay.appendChild(fileBox);
            this.#files.push(file);
            close.addEventListener('click', (e) => {
                this.#onFileRemoveClick(file.name, fileBox.id);
            });
        });

        document.getElementById('fileInput').value = '';
    }


    #onFileRemoveClick(filename, id) {
        let found = false;
        for (let i = 1; i < this.#files.length; i++) {
            if (this.#files[i].name === filename) {
                this.#files.splice(i, 1);
                found = true;
                break;
            }
        }
        const el = document.getElementById(id);
        if (el) {
            el.parentNode.removeChild(el);
        }
    }

    async #onUploadClick() {
        try {
            const file = await this.#buildEncryptedFile();
            const fileId = await this.#uploadFile(file);
            let uc = await this.#createUrl(fileId);

            const diag = document.createElement('dialog');
            diag.className = 'share';
            let html = '<h4>Klicken zum Kopieren</h4>';
            if (uc.code) {
                html += '<div class="code"><div>Code</div><div class="value">' + uc.code + '</div></div>';
            }
            html += '<div class="url"><div>Link</div><div class="value">' + uc.url + '</div></div>';
            html += '<button class="close">Schliessen</button>';
            diag.innerHTML = html;
            document.body.appendChild(diag);
            diag.showModal();
            diag.querySelector('button.close').addEventListener('click', () => {
                diag.close();
                document.body.removeChild(diag);
            });

            if (uc.code) {
                diag.querySelector('.code .value').addEventListener('click', () => {
                    navigator.clipboard.writeText(uc.code);
                });
            }
            diag.querySelector('.url .value').addEventListener('click', () => {
                navigator.clipboard.writeText(uc.url);
            });

        } catch (e) {
            window.alert(`Failed to upload: ${e.message}`);
        }
    }

    #onOpeningsChange(e) {
        const val = parseInt(e.target.value);
        document.getElementById('openingsVal').textContent = val > 20 ? 'unbeschränkt' : val + 'x';
    }

    #onDaysChange(e) {
        const val = parseInt(e.target.value);
        document.getElementById('rangeVal').textContent = val + ' Tage';
    }
}