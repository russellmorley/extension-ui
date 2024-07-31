Extension-ui is a React-based design pattern and set of components for developing user interfaces that can be reused as Platform.bible
Extensions, in web application portals, VS Code extensions, as well as other applications. User interfaces based on these components can obtain, process, and cache data from external sources, then access cached data for improved performance and offline use cases.

Extension-ui also includes a reference implementation UI for SIL's AQuA quality assessments as well as a reusable tokenized corpus display.

# Getting started

## Setup

1. Clone [this repository](https://github.com/russellmorley/extension-ui)
2. `cd extension-ui` and run `npm install`.
3. `cd ..` and then `git clone https://github.com/paranext/paranext-core` (should create a sibling directory `paranext-core`) , 
4. Follow [instructions in readme](https://github.com/paranext/paranext-core?tab=readme-ov-file#developer-install), including
running `npm install`.
6. Set the generative model keys in src/shared/services/textinsights.service.ts lines 51, 80, and 128 for 
deep-translate1.p.rapidapi.com detect, translate, and ChatGPT, respectively.
7. `cd ../extension-ui`

## Run in development mode

From the `extension-ui` directory run `npm start` to start Platform.bible in development mode and load the extenions in tab windows.

# References

Patterns, naming standards, directory structure, and components were based on [platform.bible extension template](https://github.com/paranext/paranext-extension-template).

See [platform.bible extension wiki](https://github.com/paranext/paranext-extension-template/wiki) for more information, including build instructions.