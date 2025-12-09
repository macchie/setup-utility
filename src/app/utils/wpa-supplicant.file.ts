
import { 
  writeTextFile, 
  readTextFile, 
  BaseDirectory, 
  exists,
  remove
} from '@tauri-apps/plugin-fs';

interface WpaNetwork {
  ssid: string;
  psk?: string;
  key_mgmt?: string;
  priority?: number;
  [key: string]: string | number | undefined;
}

export class WPASupplicantFile {
  
  public filePath: string;
  public globals: string[] = []; // Stores lines like ctrl_interface
  public network: WpaNetwork = {
    ssid: '',
    psk: ''
  };

  constructor(filePath: string = '/etc/wpa_supplicant/wpa_supplicant.conf') {
    this.filePath = filePath;
  }

  /**
   * Reads the file and parses it into memory.
   */
  async load(): Promise<void> {
    try {
      const content = await readTextFile(this.filePath);
      this.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn(`File not found at ${this.filePath}. Starting with empty config.`);
        this.globals = [];
        this.network = { ssid: '', psk: '' };
      }
    }
  }

  /**
   * Serializes the current state and writes it back to disk.
   */
  async save(): Promise<void> {
    const content = this.stringify();
    // Debian 12 wpa_supplicant usually requires root permissions.
    try {
      await writeTextFile(this.filePath, content);
    } catch (error: any) {
      throw new Error(`Failed to write config (Check Permissions/Sudo): ${error.message}`);
    }
  }

  private parse(content: string): void {
    const lines = content.split('\n');
    let insideNetwork = false;
    let currentNetwork: any = {};

    this.globals = [];
    this.network = { ssid: '', psk: '' };

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue; // Skip comments/empty

      if (line.startsWith('network={')) {
        insideNetwork = true;
        continue;
      }

      if (line === '}') {
        if (insideNetwork) {
          insideNetwork = false;
        }
        continue;
      }

      if (insideNetwork) {
        // Parse key=value inside network block
        const [key, ...valParts] = line.split('=');
        if (key && valParts.length > 0) {
          const value = valParts.join('=').trim().replace(/"/gm,'');
          // Try to convert numbers, keep strings as is
          this.network[key.trim()] = isNaN(Number(value)) ? value : Number(value);
        }
      } else {
        // Global configuration lines
        this.globals.push(line);
      }
    }
  }

  private stringify(): string {
    const lines: string[] = [];

    if (this.globals.length > 0) {
      lines.push(...this.globals);
      lines.push(''); // spacer
    } else {
      lines.push('ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev');
      lines.push('update_config=1');
      lines.push('country=IT'); // Should ideally be configurable
      lines.push('');
    }

    lines.push('network={');
    for (const [key, value] of Object.entries(this.network)) {
      lines.push(`  ${key}="${value}"`);
    }
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }
}