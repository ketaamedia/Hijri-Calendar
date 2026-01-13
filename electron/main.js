const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    icon: path.join(__dirname, '../client/public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/client/index.html'));
  }

  const menuTemplate = [
    {
      label: 'الرزنامة',
      submenu: [
        {
          label: 'حول التطبيق',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول الرزنامة',
              message: 'الرزنامة - التقويم الهجري والميلادي',
              detail: 'تطبيق تقويم ثنائي اللغة يدعم التقويم الهجري حسب رؤية الهلال\n\nالإصدار: 1.0.0',
            });
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'إغلاق' },
      ],
    },
    {
      label: 'تحرير',
      submenu: [
        { role: 'undo', label: 'تراجع' },
        { role: 'redo', label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'قص' },
        { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' },
        { role: 'selectAll', label: 'تحديد الكل' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { role: 'reload', label: 'تحديث' },
        { role: 'forceReload', label: 'إعادة تحميل' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'حجم افتراضي' },
        { role: 'zoomIn', label: 'تكبير' },
        { role: 'zoomOut', label: 'تصغير' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة' },
      ],
    },
  ];

  if (isDev) {
    menuTemplate[2].submenu.push(
      { type: 'separator' },
      { role: 'toggleDevTools', label: 'أدوات المطور' }
    );
  }

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
