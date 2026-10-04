# Changelog

## 0.1.0 (2026-10-04)


### Features

* **council:** /council, members in parallel, summary, pane and auto-review ([c0678b3](https://github.com/apolenkov/claude-mods/commit/c0678b33090f4abb126d44627a9d6c60ce90a7a3))
* **council:** ask the configured system one api; no key for a loopback server ([0d52bd0](https://github.com/apolenkov/claude-mods/commit/0d52bd03f910a066cf5b4e32eea9f6839de356b6))
* **council:** pi and devin read their prompt from a file ([339e088](https://github.com/apolenkov/claude-mods/commit/339e0880d4065c6b51643d3abdb716629c57d335))
* **council:** pure model for members, parsing, detection, limits and diff input ([c83764c](https://github.com/apolenkov/claude-mods/commit/c83764c5f7f2b805aad3cf965e2ef76006caadfd))
* **council:** run the summary on the configured model; cite the Jev batch rule by id ([db44b46](https://github.com/apolenkov/claude-mods/commit/db44b468734b44acaaf24693ad91192c84d6239d))
* **council:** summarizerModel option, sonnet by default ([525b37c](https://github.com/apolenkov/claude-mods/commit/525b37c1d38b982283251e9812d3f4463790d477))
* **council:** summary model for Claude and Jev scoring ([434c6c4](https://github.com/apolenkov/claude-mods/commit/434c6c429bb4d438b1634e8ee46afbf8c93bca51))
* **council:** systemOneUrl and systemOneModel options ([5408e09](https://github.com/apolenkov/claude-mods/commit/5408e0924fef16f55d9065a44026c02bfedc7b30))
* **council:** validate the system one url, http only to loopback ([77d6f62](https://github.com/apolenkov/claude-mods/commit/77d6f629efe4fd54b61f3488c61d05d118717ce7))
* **council:** write the prompt file under TMPDIR, remove it after the run ([4b746e4](https://github.com/apolenkov/claude-mods/commit/4b746e4526f5faf453d0cba5369e0df82085fd69))


### Bug Fixes

* **council:** a completion the engine refuses ends the run with the raw findings ([b12fe0f](https://github.com/apolenkov/claude-mods/commit/b12fe0f0ac7beec39a5262cce49b75ae82f893be))
* **council:** a finding without a valid dedupe answer stands alone ([ae120ca](https://github.com/apolenkov/claude-mods/commit/ae120ca3a43711969bbdc1a520500af092faeb09))
* **council:** a reply with no summary field falls back to the raw findings ([c99fe5a](https://github.com/apolenkov/claude-mods/commit/c99fe5a43d696b1ec43c4adf493ebaad710ecb99))
* **council:** claim the council in one conditional update ([8a2a6b6](https://github.com/apolenkov/claude-mods/commit/8a2a6b60899f1bd94c687a37073edf512175bee0))
* **council:** end a run a reload cut short at the next session start ([eca07ca](https://github.com/apolenkov/claude-mods/commit/eca07ca5f1fa7794d2499867ab5c9d0fb797ca8e))
* **council:** keep every .env-prefixed untracked file out of the prompt ([23807a1](https://github.com/apolenkov/claude-mods/commit/23807a1d7fce7ffdfbdb371ef87e096a179611d6))
* **council:** read untracked names nul-separated, as on disk ([e6f217f](https://github.com/apolenkov/claude-mods/commit/e6f217fe35619b52ea1b35e2263ce4a7388390d9))
