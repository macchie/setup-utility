
import { 
  writeTextFile, 
  readTextFile, 
  BaseDirectory, 
  exists,
  remove
} from '@tauri-apps/plugin-fs';
import { Shell } from './shell';

export interface EnvVar {
  key: string,
  value: string,
  exported?: boolean,
  enabled?: boolean,
  _new?: boolean,
  _delete?: boolean,
}

export class EnvVarFile {

  private _fileSaved: boolean = false;
  private _filePath!: string;
  private _vars: { [key: string]: EnvVar } = {};

  constructor(_path: string) {
    this._filePath = _path
    this.load();
  }

  public getFilePath() {
    return this._filePath;
  }

  public isSaved() {
    return this._fileSaved;
  }

  public varExists(key: string) {
    if (this._fileSaved) {
      return this._vars[key] !== undefined;
    } else {
      return this._vars[key] !== undefined && this._vars[key]._new;
    }
  }

  public getValue(key: string) {
    if (this._vars[key]) {
      return this._vars[key].value;
    }

    return null;
  }

  public setValue(key: string, value: string) {
    if (this._vars[key]) {
      this._vars[key]._delete = false;
      this._vars[key].value = value;
    } else {
      this._vars[key] = {
        key, value,
        enabled: false,
        exported: true,
        _new: true
      };
    }
    this._fileSaved = false;
  }

  public delete(key: string, shouldDelete: boolean) {
    if (this._vars[key]) {
      this._vars[key]._delete = shouldDelete;
      this._fileSaved = false;
    }
  }

  public enable(key: string, enable: boolean) {
    const envvar = this._vars[key];

    if (envvar) {
      if (envvar._new) {
        return;
      }

      envvar.enabled = enable;
      this._fileSaved = false;
    }
  }

  public async save(useExports: boolean = true) {
    const keys = Object.keys(this._vars);

    for (const key of keys) {
      const envvar = this._vars[key];
      
      const escapedValue = this.escapeValue(envvar.value);

      if (useExports) {
        if (envvar._delete) {
          await Shell.run(`sed -i /^\\(export *\\|# *export *\\|#export *\\|\\)${key}\\(\\| *\\)=\\(\\| *\\).*$/d ${this._filePath}`);
          continue;
        }
        
        if (envvar._new) {
          await Shell.run(`echo "export ${key}=\\"${envvar.value}\\"" >> ${this._filePath}`);
        } else {
          await Shell.run(`sed -i s/^\\(export *\\|# *export *\\|#export *\\|\\)${key}\\(\\| *\\)=\\(\\| *\\).*$/${envvar.enabled ? '' : '# '}export ${key}=\\"${escapedValue}\\"/ ${this._filePath}`);
        }
      } else {
        if (envvar._delete) {
          await Shell.run(`sed -i /^\\(export *\\|# *export *\\|#export *\\|\\)${key}\\(\\| *\\)=\\(\\| *\\).*$/d ${this._filePath}`);
          continue;
        }
        
        if (envvar._new) {
          await Shell.run(`echo "${key}=${envvar.value}" >> ${this._filePath}`);
        } else {
          await Shell.run(`sed -i s/^\\(export *\\|# *export *\\|#export *\\|\\)${key}\\(\\| *\\)=\\(\\| *\\).*$/${envvar.enabled ? '' : '# '}${key}=${escapedValue}/ ${this._filePath}`);
        }
      }

    }

    this._fileSaved = true;

    console.log(`File '${this._filePath}' saved!`);

    return true;
  }

  // private

  public logStatus(label = 'status') {
    // Logger.info(`File '${this._filePath} is saved? ${this._fileSaved ? 'YES' : 'NO'}`)
    // for (const k of Object.keys(this._vars)) {
    //   Logger.info(`[${label}] ${k} value: ${this._vars[k].value}, exported: ${this._vars[k].exported}, enabled: ${this._vars[k].enabled}`)
    // }
  }

  private async load() {
    const ENV_VAR_REGEXP = /^(#)?(export|# *export)? *[a-zA-Z_$]*= *.*$/gim;

    if (await exists(this._filePath)) {
      const _content = await readTextFile(this._filePath);
      const matches = _content.match(ENV_VAR_REGEXP);

      if (matches) {
        for (const match of matches) {
          const [ key, value ] = match.split('=');
  
          const cleanKey = key.replace(/(#)?(export|# *export)?/g,'').trim();
          const cleanValue = value.replace(/\"/g,'').trim();
  
          if (cleanKey && cleanValue) {
            this._vars[cleanKey] = {
              key: cleanKey,
              value: cleanValue,
              enabled: key.startsWith('#') === false,
              exported: key.includes('export')
            }
          }
        }
      }

      this._fileSaved = true;
    } else {
      this._fileSaved = false;
    }
    
    this.logStatus(`initial`);
  }

  private escapeValue(value: string) {
    return value
      .replace(/\./gi,'\\.')
      .replace(/\"/gi,'\\"')
      .replace(/:/gi,'\\:')
      .replace(/\//gi,'\\/');
  }
}