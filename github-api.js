window.GitHubAPI = {
  owner: 'zerokemx-ui',
  repo: 'GuruGuru',
  branch: 'main',
  token: null,

  _headers() {
    return {
      Authorization: 'token ' + this.token,
      Accept: 'application/vnd.github.v3+json',
    };
  },

  _utf8ToBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  },

  async validate() {
    var res = await fetch(
      'https://api.github.com/repos/' + this.owner + '/' + this.repo,
      { headers: this._headers() }
    );
    return res.ok;
  },

  async getFile(path) {
    var url =
      'https://api.github.com/repos/' + this.owner + '/' + this.repo +
      '/contents/' + path + '?ref=' + this.branch;
    var res = await fetch(url, { headers: this._headers() });
    if (!res.ok) throw new Error(res.status + '');
    var json = await res.json();
    var raw = atob(json.content.replace(/\n/g, ''));
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return { content: new TextDecoder().decode(bytes), sha: json.sha };
  },

  async getFileSha(path) {
    var url =
      'https://api.github.com/repos/' + this.owner + '/' + this.repo +
      '/contents/' + path + '?ref=' + this.branch;
    var res = await fetch(url, { headers: this._headers() });
    if (!res.ok) throw new Error(res.status + '');
    var json = await res.json();
    return json.sha;
  },

  async putFile(path, textContent, sha, message) {
    var body = {
      message: message || 'Update ' + path,
      content: this._utf8ToBase64(textContent),
      branch: this.branch,
    };
    if (sha) body.sha = sha;
    var url =
      'https://api.github.com/repos/' + this.owner + '/' + this.repo +
      '/contents/' + path;
    var res = await fetch(url, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, this._headers()),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.message || res.status + '');
    }
    return await res.json();
  },

  async putBinary(path, base64, sha, message) {
    var body = {
      message: message || 'Upload ' + path,
      content: base64,
      branch: this.branch,
    };
    if (sha) body.sha = sha;
    var url =
      'https://api.github.com/repos/' + this.owner + '/' + this.repo +
      '/contents/' + path;
    var res = await fetch(url, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, this._headers()),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.message || res.status + '');
    }
    return await res.json();
  },
};
