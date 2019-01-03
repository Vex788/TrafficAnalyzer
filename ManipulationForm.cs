using MetroFramework;
using MetroFramework.Forms;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SNMPTrafficAnalyzer
{
    public partial class ManipulationForm : MetroForm
    {
        public CaptureForm captureForm;
        public TAMessageBox TAMessageBox;

        public bool ethEdit = false;
        public PhysicalAddress sourcehw;
        public PhysicalAddress destinationhw;

        public bool ipEdit = false;
        public IPAddress sourceip;
        public IPAddress destinationip;
        public int timeToLive;

        public bool tcpEdit = false;
        public ushort sourceTcpPort;
        public ushort destinationTcpPort;
        public ushort windowSize;
        public uint acknowledgmentNumber;
        public uint sequence_number;
        public byte[] tcpDataPayload;

        public bool udpEdit = false;
        public ushort sourcePort;
        public ushort destinationPort;

        public ManipulationForm()
        {
            InitializeComponent();
            SetDoubleBuffered(this, true);

            LoopSendingCBox.SelectedIndex = 0;

            Opacity = 0;
            Timer timer = new Timer();
            timer.Tick += new EventHandler((sender, e) =>
            {
                if ((Opacity += 0.1d) == 1) timer.Stop();
            });
            timer.Interval = 1;
            timer.Start();
        }

        private void SetDoubleBuffered(Control c, bool value)
        {
            PropertyInfo pi = typeof(Control).GetProperty("DoubleBuffered", BindingFlags.SetProperty | BindingFlags.Instance | BindingFlags.NonPublic);
            if (pi != null)
            {
                pi.SetValue(c, value, null);

                MethodInfo mi = typeof(Control).GetMethod("SetStyle", BindingFlags.Instance | BindingFlags.InvokeMethod | BindingFlags.NonPublic);
                if (mi != null)
                {
                    mi.Invoke(c, new object[] { ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true });
                }

                mi = typeof(Control).GetMethod("UpdateStyles", BindingFlags.Instance | BindingFlags.InvokeMethod | BindingFlags.NonPublic);
                if (mi != null)
                {
                    mi.Invoke(c, null);
                }
            }
        }

        public static byte[] StringToByteArray(string s)
        {
            int length = (s.Length + 1) / 3;
            byte[] arr = new byte[length];
            for (int i = 0; i < length; i++)
            {
                char sixteen = s[3 * i];
                if (sixteen > '9') sixteen = (char)(sixteen - 'A' + 10);
                else sixteen -= '0';

                char ones = s[3 * i + 1];
                if (ones > '9') ones = (char)(ones - 'A' + 10);
                else ones -= '0';

                arr[i] = (byte)(16 * sixteen + ones);
            }

            return arr;
        }

        private void buttonSend_Click(object sender, EventArgs e)
        {
            try
            {
                if (LoopSendingCBox.SelectedIndex == -1)
                {
                    TAMessageBox = new TAMessageBox("Traffic Analyzer", "Select send mode", false, false);
                    TAMessageBox.Show();
                }
                else if (LoopSendingCBox.SelectedIndex == 0)
                {
                    captureForm.manipulatedOneSend = false;

                    if (ReadTimeoutBox.SelectedIndex == -1)
                    {
                        captureForm.readTimeout = 1000;
                    }
                    else
                    {
                        captureForm.readTimeout = Convert.ToInt32(LoopSendingCBox.SelectedValue);
                    }
                }
                else if (LoopSendingCBox.SelectedIndex == 1)
                {
                    captureForm.manipulatedOneSend = true;
                }

                // eth packet
                try
                {
                    sourcehw = PhysicalAddress.Parse(textBoxSourceHwAddress.Text.
                        Trim(new char[] { ' ' }).Replace(':', '-'));
                    destinationhw = PhysicalAddress.Parse(textBoxDestinationHwAddress.Text.
                        Trim(new char[] { ' ' }).Replace(':', '-'));
                }
                catch (FormatException ex)
                {
                    TAMessageBox = new TAMessageBox("Error ETH packet", ex.ToString(), false, true);
                    TAMessageBox.Show();
                    return;
                }
                // ip packet
                try
                {
                    sourceip = IPAddress.Parse(textBoxSourceAddress.Text.Trim(new char[] { ' ' }));
                    destinationip = IPAddress.Parse(textBoxDestinationAddress.Text.Trim(new char[] { ' ' }));
                    timeToLive = Convert.ToInt32(textBoxTimeToLive.Text.Trim(new char[] { ' ' }));
                }
                catch (FormatException ex)
                {
                    //TAMessageBox = new TAMessageBox("Error IP packet", ex.ToString(), false, true);
                    //TAMessageBox.Show();
                    //return;
                }
                catch (Exception)
                {

                }
                // tcp packet
                try
                {
                    sourceTcpPort = Convert.ToUInt16(textBoxTcpSourcePort.Text.Trim(new char[] { ' ' }));
                    destinationTcpPort = Convert.ToUInt16(textBoxTcpDestinationPort.Text.Trim(new char[] { ' ' }));
                    windowSize = Convert.ToUInt16(textBoxWindowSize.Text.Trim(new char[] { ' ' }));
                    acknowledgmentNumber = Convert.ToUInt32(textBoxAcknowlegmentNumber.Text.Trim(new char[] { ' ' }));
                    sequence_number = Convert.ToUInt32(textBoxSequenceNumber.Text.Trim(new char[] { ' ' }));
                    tcpDataPayload = StringToByteArray(textBoxTcpDataPayload.Text.Trim(new char[] { ' ' }));
                }
                catch (FormatException ex)
                {
                    TAMessageBox = new TAMessageBox("Error TCP packet", ex.ToString(), false, true);
                    TAMessageBox.Show();
                    return;
                }
                // udp packet
                try
                {
                    if (!string.IsNullOrEmpty(textBoxSourcePort.Text) && 
                        !string.IsNullOrEmpty(textBoxTcpDestinationPort.Text))
                    {
                        sourcePort = Convert.ToUInt16(textBoxSourcePort.Text.Trim(new char[] { ' ' }));
                        destinationPort = Convert.ToUInt16(textBoxDestinationPort.Text.Trim(new char[] { ' ' }));
                    }
                }
                catch (FormatException ex)
                {
                    TAMessageBox = new TAMessageBox("Error UDP packet", ex.ToString(), false, true);
                    TAMessageBox.Show();
                    return;
                }

                captureForm.manipulated = true;
                Close();
            }
            catch (Exception ex)
            {
                TAMessageBox = new TAMessageBox("Error btnSend_Click", ex.ToString(), false, true);
                TAMessageBox.Show();
            }
        }

        private void buttonClose_Click(object sender, EventArgs e)
        {
            while (this.Opacity != 0)
                this.Opacity -= 0.00035d;

            captureForm.manipulated = false;
            Close();
        }

        private void ManipulationForm_Load(object sender, EventArgs e)
        {
            try
            {
                if (captureForm.manipulatedOneSend)
                {
                    LoopSendingCBox.SelectedIndex = 0;
                }
                else
                {
                    LoopSendingCBox.SelectedIndex = 1;
                }

                // eth packet
                textBoxSourceHwAddress.Text = sourcehw.ToString();
                textBoxDestinationHwAddress.Text = destinationhw.ToString();

                // ip packet
                textBoxSourceAddress.Text = sourceip.ToString();
                textBoxDestinationAddress.Text = destinationip.ToString();
                textBoxTimeToLive.Text = timeToLive.ToString();

                // tcp packet
                textBoxTcpSourcePort.Text = sourceTcpPort.ToString();
                textBoxTcpDestinationPort.Text = destinationTcpPort.ToString();
                textBoxWindowSize.Text = windowSize.ToString();
                textBoxAcknowlegmentNumber.Text = acknowledgmentNumber.ToString();
                textBoxSequenceNumber.Text = sequence_number.ToString();
                textBoxTcpDataPayload.Text = BitConverter.ToString(tcpDataPayload);

                // udp packet
                textBoxSourcePort.Text = sourcePort.ToString();
                textBoxDestinationPort.Text = destinationPort.ToString();
            }
            catch (Exception ex)
            {
                Console.WriteLine("{0}:\n{1}", "Error ManipulationForm_Load", ex.ToString());
            }
        }
        
        private void ManipulationForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            while (this.Opacity != 0)
                this.Opacity -= 0.00035d;
        }

        private void LoopSendingCBox_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (LoopSendingCBox.SelectedIndex == -1)
            {
                ReadTimeoutBox.Enabled = false;
            }
            else if (LoopSendingCBox.SelectedIndex == 0)
            {
                ReadTimeoutBox.Enabled = true;
            }
            else if (LoopSendingCBox.SelectedIndex == 1)
            {
                ReadTimeoutBox.Enabled = false;
            }
        }
    }
}
