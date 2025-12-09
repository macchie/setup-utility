
export const CRONTAB_DEFAULTS = {
  shell: '/bin/bash',
  path: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
};

export const CRONTAB_DEFAULT_TASKS = {

  REBOOT_POS: {
    rule: `0 4 * * *`,
    description: `Reboot POS`,
    command: `/sbin/reboot`,
    active: true,
    readonly: true,
    editable: true
  },

  FIX_DATE: {
    rule: `@reboot`,
    description: `Fix /bin/date`,
    command: `chmod +s /bin/date`,
    active: true,
    readonly: true,
    editable: false
  },

  UPDATE_AND_SYNC: {
    rule: `@reboot`,
    description: `POS Sync Operations`,
    command: `sleep 7 && /bin/bash -c 'ecli update && ecli sync'`,
    active: true,
    readonly: true,
    editable: true
  },

  START_VNC_SERVER: {
    rule: `@reboot`,
    description: `Start VNC Server`,
    command: `su elvispos -c /usr/share/elvispos/startvnc >> /usr/share/elvispos/startvnc.log 2>&1`,
    active: true,
    readonly: true,
    editable: false
  },

  START_POS_SUITE: {
    rule: `@reboot`,
    description: `Start POS Suite`,
    command: `su elvispos -c /usr/share/elvispos/startall >> /usr/share/elvispos/startall.log 2>&1`,
    active: true,
    readonly: true,
    editable: false
  },

}