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
            helpEl.innerHTML = this.#files.length === 1 ? 'Dateianhang:' : 'Dateianhänge:';
            container.appendChild(helpEl);

            const fileContainer = document.createElement('div');
            fileContainer.className = 'download-file-container';

            this.#files.forEach((file) => {
                const linkContainer = document.createElement('div');
                linkContainer.className = 'link-container';
                fileContainer.appendChild(linkContainer);

                const link = document.createElement('a');
                link.href = URL.createObjectURL(file);
                link.setAttribute('download', file.name);
                link.setAttribute('target', '_blank');
                linkContainer.appendChild(link);

                // icon
                const iconEl = document.createElement('img');
                iconEl.src = this.#getFileIconPath(file.name);
                iconEl.className = 'icon';
                link.appendChild(iconEl);

                // text
                const linkText = document.createElement('div');
                linkText.textContent = file.name;
                linkText.className = 'text';
                link.appendChild(linkText);
            });

            container.appendChild(fileContainer);

            // Download as Zip
            if (this.#files.length > 1) {
                const helpEl = document.createElement('div');
                helpEl.className = 'infotext';
                helpEl.innerHTML = 'Alle Dateien als zip:';
                container.appendChild(helpEl);

                const fileContainer = document.createElement('div');
                fileContainer.className = 'download-file-container';
                container.appendChild(fileContainer);

                const linkContainer = document.createElement('div');
                linkContainer.className = 'link-container';
                fileContainer.appendChild(linkContainer);

                const link = document.createElement('a');
                link.style.cursor = 'pointer';
                link.addEventListener('click', e => {
                    this.#downloadFilesAsZip();
                });
                linkContainer.appendChild(link);

                // icon
                const iconEl = document.createElement('img');
                iconEl.src = this.#getFileIconPath('files.zip');
                iconEl.className = 'icon';
                link.appendChild(iconEl);

                // text
                const linkText = document.createElement('div');
                linkText.textContent = this.#files.length + ' Dateien';
                linkText.className = 'text';
                link.appendChild(linkText);
            }

        }
    }

    async #downloadFilesAsZip() {
        const downloader = await import('./ziplib/NullZipArchive.js');
        const zip = new downloader.NullZipArchive('transfer.zip', false);
        for (const file of this.#files) {
            zip.addFileFromUint8Array(file.name, new Uint8Array(await file.arrayBuffer()));
        }
        const atag = zip.createDownloadLink('files.zip');
        atag.style.display = 'none';
        document.body.appendChild(atag);
        atag.click();
        window.setTimeout(() => {
            document.body.removeChild(atag);
        }, 500);
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

    #getFileIconPath(filename) {
        const basePath = 'resources/file-icons';
        const list = ['3g2.svg', '3ga.svg', '3gp.svg', '7z.svg', 'aa.svg', 'aac.svg', 'ac.svg', 'accdb.svg', 'accdt.svg',
            'ace.svg', 'adn.svg', 'ai.svg', 'aif.svg', 'aifc.svg', 'aiff.svg', 'ait.svg', 'amr.svg', 'ani.svg', 'apk.svg',
            'app.svg', 'applescript.svg', 'asax.svg', 'asc.svg', 'ascx.svg', 'asf.svg', 'ash.svg', 'ashx.svg', 'asm.svg',
            'asmx.svg', 'asp.svg', 'aspx.svg', 'asx.svg', 'au.svg', 'aup.svg', 'avi.svg', 'axd.svg', 'aze.svg', 'bak.svg',
            'bash.svg', 'bat.svg', 'bin.svg', 'blank.svg', 'bmp.svg', 'bowerrc.svg', 'bpg.svg', 'browser.svg', 'bz2.svg',
            'bzempty.svg', 'c.svg', 'cab.svg', 'cad.svg', 'caf.svg', 'cal.svg', 'catalog.json', 'cd.svg', 'cdda.svg', 'cer.svg',
            'cfg.svg', 'cfm.svg', 'cfml.svg', 'cgi.svg', 'chm.svg', 'class.svg', 'cmd.svg', 'code-workspace.svg', 'codekit.svg',
            'coffee.svg', 'coffeelintignore.svg', 'com.svg', 'compile.svg', 'conf.svg', 'config.svg', 'cpp.svg', 'cptx.svg',
            'cr2.svg', 'crdownload.svg', 'crt.svg', 'crypt.svg', 'cs.svg', 'csh.svg', 'cson.svg', 'csproj.svg', 'css.svg',
            'csv.svg', 'cue.svg', 'cur.svg', 'dart.svg', 'dat.svg', 'data.svg', 'db.svg', 'dbf.svg', 'deb.svg', 'default.svg',
            'dgn.svg', 'dist.svg', 'diz.svg', 'dll.svg', 'dmg.svg', 'dng.svg', 'doc.svg', 'docb.svg', 'docm.svg', 'docx.svg',
            'dot.svg', 'dotm.svg', 'dotx.svg', 'download.svg', 'dpj.svg', 'dsn.svg', 'ds_store.svg', 'dtd.svg', 'dwg.svg',
            'dxf.svg', 'editorconfig.svg', 'el.svg', 'elf.svg', 'eml.svg', 'enc.svg', 'eot.svg', 'eps.svg', 'epub.svg',
            'eslintignore.svg', 'exe.svg', 'f4v.svg', 'fax.svg', 'fb2.svg', 'fla.svg', 'flac.svg', 'flv.svg', 'fnt.svg',
            'folder.svg', 'fon.svg', 'gadget.svg', 'gdp.svg', 'gem.svg', 'gif.svg', 'gitattributes.svg', 'gitignore.svg',
            'go.svg', 'gpg.svg', 'gpl.svg', 'gradle.svg', 'gz.svg', 'h.svg', 'handlebars.svg', 'hbs.svg', 'heic.svg',
            'hlp.svg', 'hs.svg', 'hsl.svg', 'htm.svg', 'html.svg', 'ibooks.svg', 'icns.svg', 'ico.svg', 'ics.svg', 'idx.svg',
            'iff.svg', 'ifo.svg', 'image.svg', 'img.svg', 'iml.svg', 'in.svg', 'inc.svg', 'indd.svg', 'inf.svg', 'info.svg',
            'ini.svg', 'inv.svg', 'iso.svg', 'j2.svg', 'jar.svg', 'java.svg', 'jpe.svg', 'jpeg.svg', 'jpg.svg', 'js.svg',
            'json.svg', 'jsp.svg', 'jsx.svg', 'key.svg', 'kf8.svg', 'kmk.svg', 'ksh.svg', 'kt.svg', 'kts.svg', 'kup.svg',
            'less.svg', 'lex.svg', 'licx.svg', 'lisp.svg', 'lit.svg', 'lnk.svg', 'lock.svg', 'log.svg', 'lua.svg', 'm.svg',
            'm2v.svg', 'm3u.svg', 'm3u8.svg', 'm4.svg', 'm4a.svg', 'm4r.svg', 'm4v.svg', 'map.svg', 'master.svg', 'mc.svg',
            'md.svg', 'mdb.svg', 'mdf.svg', 'me.svg', 'mi.svg', 'mid.svg', 'midi.svg', 'mk.svg', 'mkv.svg', 'mm.svg',
            'mng.svg', 'mo.svg', 'mobi.svg', 'mod.svg', 'mov.svg', 'mp2.svg', 'mp3.svg', 'mp4.svg', 'mpa.svg', 'mpd.svg', 'mpe.svg',
            'mpeg.svg', 'mpg.svg', 'mpga.svg', 'mpp.svg', 'mpt.svg', 'msg.svg', 'msi.svg', 'msu.svg', 'nef.svg', 'nes.svg',
            'nfo.svg', 'nix.svg', 'npmignore.svg', 'ocx.svg', 'odb.svg', 'ods.svg', 'odt.svg', 'ogg.svg', 'ogv.svg', 'ost.svg',
            'otf.svg', 'ott.svg', 'ova.svg', 'ovf.svg', 'p12.svg', 'p7b.svg', 'pages.svg', 'part.svg', 'pcd.svg', 'pdb.svg',
            'pdf.svg', 'pem.svg', 'pfx.svg', 'pgp.svg', 'ph.svg', 'phar.svg', 'php.svg', 'pid.svg', 'pkg.svg', 'pl.svg',
            'plist.svg', 'pm.svg', 'png.svg', 'po.svg', 'pom.svg', 'pot.svg', 'potx.svg', 'pps.svg', 'ppsx.svg', 'ppt.svg',
            'pptm.svg', 'pptx.svg', 'prop.svg', 'ps.svg', 'ps1.svg', 'psd.svg', 'psp.svg', 'pst.svg', 'pub.svg', 'py.svg',
            'pyc.svg', 'qt.svg', 'ra.svg', 'ram.svg', 'rar.svg', 'raw.svg', 'rb.svg', 'rdf.svg', 'rdl.svg', 'reg.svg',
            'resx.svg', 'retry.svg', 'rm.svg', 'rom.svg', 'rpm.svg', 'rpt.svg', 'rsa.svg', 'rss.svg', 'rst.svg', 'rtf.svg',
            'ru.svg', 'rub.svg', 'sass.svg', 'scss.svg', 'sdf.svg', 'sed.svg', 'sh.svg', 'sit.svg', 'sitemap.svg',
            'skin.svg', 'sldm.svg', 'sldx.svg', 'sln.svg', 'sol.svg', 'sphinx.svg', 'sql.svg', 'sqlite.svg', 'step.svg',
            'stl.svg', 'svg.svg', 'swd.svg', 'swf.svg', 'swift.svg', 'swp.svg', 'sys.svg', 'tar.svg', 'tax.svg', 'tcsh.svg',
            'tex.svg', 'tfignore.svg', 'tga.svg', 'tgz.svg', 'tif.svg', 'tiff.svg', 'tmp.svg', 'tmx.svg', 'torrent.svg',
            'tpl.svg', 'ts.svg', 'tsv.svg', 'ttf.svg', 'twig.svg', 'txt.svg', 'udf.svg', 'vb.svg', 'vbproj.svg', 'vbs.svg',
            'vcd.svg', 'vcf.svg', 'vcs.svg', 'vdi.svg', 'vdx.svg', 'vmdk.svg', 'vob.svg', 'vox.svg', 'vscodeignore.svg',
            'vsd.svg', 'vss.svg', 'vst.svg', 'vsx.svg', 'vtx.svg', 'war.svg', 'wav.svg', 'wbk.svg', 'webinfo.svg', 'webm.svg',
            'webp.svg', 'wma.svg', 'wmf.svg', 'wmv.svg', 'woff.svg', 'woff2.svg', 'wps.svg', 'wsf.svg', 'xaml.svg', 'xcf.svg',
            'xfl.svg', 'xlm.svg', 'xls.svg', 'xlsm.svg', 'xlsx.svg', 'xlt.svg', 'xltm.svg', 'xltx.svg', 'xml.svg', 'xpi.svg',
            'xps.svg', 'xrb.svg', 'xsd.svg', 'xsl.svg', 'xspf.svg', 'xz.svg', 'yaml.svg', 'yml.svg', 'z.svg', 'zip.svg', 'zsh.svg'];

        const m = filename.match(/\.([a-z0-9]+)$/i);
        if (m) {
            const type = m[1].toLowerCase(), x = list.indexOf(type + '.svg');
            if (x !== -1) {
                return basePath + '/' + list[x];
            }
        }
        return basePath + '/' + 'download.svg';
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