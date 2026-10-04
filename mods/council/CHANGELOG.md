# Changelog

## [0.2.0](https://github.com/apolenkov/claude-mods/compare/council-v0.1.0...council-v0.2.0) (2026-10-04)


### Features

* **council:** find running background bash tasks in the transcript ([54ecd46](https://github.com/apolenkov/claude-mods/commit/54ecd46ecb81a29e94773f366c5aa7f3b00b57e3))


### Bug Fixes

* **council:** /council cancel, and a status line that clears once seen ([ff0a2d3](https://github.com/apolenkov/claude-mods/commit/ff0a2d3f9a06ddc6ac1fe4e1337f2eb2f617d8a2))
* **council:** a run outliving its module never leaves an unhandled rejection ([78d745f](https://github.com/apolenkov/claude-mods/commit/78d745f1846a8d9ee9fe6e7510fd067de64ae07b))
* **council:** a run writes only to the run it claimed ([8370c9e](https://github.com/apolenkov/claude-mods/commit/8370c9e338ebf725e000feb798fb99ce27c1d19e))
* **council:** a running background bash task holds the auto-review back ([3b5429d](https://github.com/apolenkov/claude-mods/commit/3b5429d1c9b40c557f7fe2659421d4e6b4c957df))
* **council:** a stopped task has ended; a stuck notice does not end one ([cf6f6a0](https://github.com/apolenkov/claude-mods/commit/cf6f6a0c1ea2e3aa78d03b8647e1c3589b3aeb8f))
* **council:** drop the own council: prefix from status and toasts ([54be3ab](https://github.com/apolenkov/claude-mods/commit/54be3abe8a1e42a801c9ffdeb2a49b976793a11f))
* **council:** no auto-review while a subagent is still running ([4a1131c](https://github.com/apolenkov/claude-mods/commit/4a1131cf887d31ce701f7279a34f9a379f4ebd2d))
* **council:** one finding is singular ([c615f8f](https://github.com/apolenkov/claude-mods/commit/c615f8facaadb7857999e553e65bb1478ae7a3cf))
* **council:** stop a reviewer's timers when its stream rejects ([cf6c671](https://github.com/apolenkov/claude-mods/commit/cf6c67146fd33b5ad8b879c01962873e193b6c2e))

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
