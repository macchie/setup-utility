export const IP_ADDR_REGEXP = new RegExp(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);

export class Helpers {

  public static isValidIP(string: string = ''): boolean {
    return IP_ADDR_REGEXP.test(string);
  }
    
  public static isValidURL(string: string = ''): boolean {
    const parts = string.split(',');
    let valid = false;
    for (let url of parts) {
      try {
        if (!url.startsWith('http')) {
          url = `http://${url}`;
        }
        new URL(url);
        valid = true;
      } catch (error) {
      }
    }
    return valid;
  }
    
  public static async sleep(amt: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), amt);
    })
  }
}