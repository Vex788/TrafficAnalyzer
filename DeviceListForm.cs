using MetroFramework.Forms;
using SharpPcap;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SNMPTrafficAnalyzer
{
    public partial class DeviceListForm : MetroForm
    {
        public DeviceListForm()
        {
            InitializeComponent();

            Opacity = 0;
            Timer timer = new Timer();
            timer.Tick += new EventHandler((sender, e) =>
            {
                if ((Opacity += 0.1d) == 1) timer.Stop();
            });
            timer.Interval = 1;
            timer.Start();
        }

        private void DeviceListForm_Load(object sender, EventArgs e)
        {
            captureDevices = CaptureDeviceList.Instance;

            foreach (var dev in captureDevices)
            {
                var str = dev.Name.Substring(dev.Name.LastIndexOf('\\') + 1,
                    dev.Name.Length - dev.Name.LastIndexOf('\\') - 1);
                deviceList.Items.Add(str);
            }
        }

        public CaptureDeviceList captureDevices;

        public delegate void OnItemSelectedDelegate(int itemIndex);
        public event OnItemSelectedDelegate OnItemSelected;

        public delegate void OnCancelDelegate();

        private void buttonCancel_Click(object sender, EventArgs e)
        {
            while (this.Opacity != 0)
                this.Opacity -= 0.00035d;
            Close();
        }

        private void buttonOk_Click(object sender, EventArgs e)
        {
            if (deviceList.SelectedItem != null)
            {
                if (OnItemSelected != null)
                {
                    OnItemSelected(deviceList.SelectedIndex);
                }
                else
                {
                    Close();
                    DeviceListForm_Load(null, null);
                }
            }
        }

        private void deviceList_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            if (deviceList.SelectedItem != null)
            {
                OnItemSelected(deviceList.SelectedIndex);
            }
        }

        private void deviceList_SelectedIndexChanged(object sender, EventArgs e)
        {
            int index = deviceList.SelectedIndex;
            if (index == -1)
            {
                index = 0;
                deviceList.SelectedItem = index;
            }

            deviceDescriptionLbl.Text = string.Format("Description: {0}",
                captureDevices[index].Description);
        }

        private void DeviceListForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            while (this.Opacity != 0)
                this.Opacity -= 0.00035d;
        }
    }
}
