using MetroFramework;
using MetroFramework.Forms;
using PacketDotNet;
using SharpPcap;
using System;
using System.Collections.Generic;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace SNMPTrafficAnalyzer
{
    public partial class CaptureForm : MetroForm
    {
        /// <summary>
        /// When true the background thread will terminate
        /// </summary>
        /// <param name="args">
        /// A <see cref="System.String"/>
        /// </param>
        private bool BackgroundThreadStop;

        /// <summary>
        /// Object that is used to prevent two threads from accessing
        /// PacketQueue at the same time
        /// </summary>
        /// <param name="args">
        /// A <see cref="System.String"/>
        /// </param>
        private object QueueLock = new object();

        /// <summary>
        /// The queue that the callback thread puts packets in. Accessed by
        /// the background thread when QueueLock is held
        /// </summary>
        private List<RawCapture> PacketQueue = new List<RawCapture>();

        /// <summary>
        /// The last time PcapDevice.Statistics() was called on the active device.
        /// Allow periodic display of device statistics
        /// </summary>
        /// <param name="args">
        /// A <see cref="System.String"/>
        /// </param>
        private DateTime LastStatisticsOutput;

        /// <summary>
        /// Interval between PcapDevice.Statistics() output
        /// </summary>
        /// <param name="args">
        /// A <see cref="System.String"/>
        /// </param>
        private TimeSpan LastStatisticsInterval = new TimeSpan(0, 0, 2);

        public class MyRenderer : ToolStripProfessionalRenderer
        {
            protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
            {
                if (!e.Item.Selected)
                {
                    base.OnRenderMenuItemBackground(e);
                }
                else
                {
                    Rectangle rc = new Rectangle(Point.Empty, e.Item.Size);
                    e.Graphics.FillRectangle(Brushes.DarkGray, rc);
                    e.Graphics.DrawRectangle(Pens.DarkGray, 0, 0, rc.Width - 1, rc.Height - 1);
                    e.Item.ForeColor = Color.FromArgb(17, 17, 17);
                }
            }
            protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
            {
                base.OnRenderItemText(e);
                if (!e.Item.Selected)
                {
                    e.Item.ForeColor = Color.FromArgb(17, 17, 17);
                }
                else
                {
                    e.Item.ForeColor = Color.FromArgb(17, 17, 17);
                }
            }
        }
        public class MenuStripAllowsCustomHighlight : MenuStrip
        {
            public MenuStripAllowsCustomHighlight(MenuStrip menuStrip)
            {
                menuStrip.Renderer = new MyRenderer();
            }
        }

        private System.Threading.Thread backgroundThread;

        private DeviceListForm deviceListForm;
        private ICaptureDevice device;
        private ManipulationForm manipulationForm;
        private TAMessageBox TAMessageBox;
        public bool logWrite = false;
        public bool logShow = false;
        private string logFile = "local_log.txt";
        private string logDirectory = Directory.GetCurrentDirectory();
        public int readTimeout = 1000;

        private void logWriting(string str)
        {
            if (logWrite)
            {
                using (StreamWriter sw = new StreamWriter(@logDirectory + "\\" + logFile, true, System.Text.Encoding.Default))
                {
                    sw.WriteLine(System.DateTime.Now.ToString() + ": " + str);
                }
            }
            if (logShow)
            {
                Console.WriteLine(System.DateTime.Now.ToString() + ": " + str);
            }
        }

        public CaptureForm()
        {
            InitializeComponent();
            Application.ApplicationExit += new EventHandler(Application_ApplicationExit);

            dataGridView.ForeColor = Color.FromArgb(235, 235, 235);
            deviceListForm = new DeviceListForm();
            deviceListForm.OnItemSelected += new DeviceListForm.OnItemSelectedDelegate(deviceListForm_OnItemSelected);

            Opacity = 0;
            System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
            timer.Tick += new EventHandler((sender, e) =>
            {
                if ((Opacity += 0.1d) == 1) timer.Stop();
            });
            timer.Interval = 1;
            timer.Start();

            SetDoubleBuffered(this, true);
            dataGridView.DefaultCellStyle.Font = new Font("Roboto", 8.8f, FontStyle.Regular);
            menuStrip1.Renderer = new MyRenderer();
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

        void Application_ApplicationExit(object sender, EventArgs e)
        {
        }

        private void CaptureForm_Load(object sender, EventArgs e)
        {
            deviceListForm = new DeviceListForm();
            deviceListForm.OnItemSelected += new DeviceListForm.OnItemSelectedDelegate(deviceListForm_OnItemSelected);
        }

        void deviceListForm_OnItemSelected(int itemIndex)
        {
            StartCapture(itemIndex);
            deviceListForm.Close();
        }

        public class PacketWrapper
        {
            public RawCapture p;

            public int Count { get; private set; }
            public IPAddress SourceIP { get; set; }
            public IPAddress DestinationIP { get; set; }
            public PosixTimeval Timeval { get { return p.Timeval; } }
            public EthernetPacketType Type { get; set; }
            public int Length { get { return p.Data.Length; } }

            public PacketWrapper(int count, RawCapture p)
            {
                this.Count = count;
                this.p = p;
            }
        }

        private PacketArrivalEventHandler arrivalEventHandler;
        private CaptureStoppedEventHandler captureStoppedEventHandler;

        private void Shutdown()
        {
            if (device != null)
            {
                device.StopCapture();
                device.Close();
                device.OnPacketArrival -= arrivalEventHandler;
                device.OnCaptureStopped -= captureStoppedEventHandler;
                device = null;

                // ask the background thread to shut down
                BackgroundThreadStop = true;

                // wait for the background thread to terminate
                backgroundThread.Join();

                // switch the icon back to the play icon
                statusImage.LoadAsync("Resources/not_work.png");
                startToolStripMenuItem.Text = "Start capture";
                startToolStripMenuItem.Image = Properties.Resources.playbtn;
            }
        }

        private void StartCapture(int itemIndex)
        {
            packetCount = 0;
            device = CaptureDeviceList.Instance[itemIndex];
            
            // set device name
            deviceNameLbl.Text =
                device.Name.Substring(device.Name.LastIndexOf('\\') + 1,
                device.Name.Length - device.Name.LastIndexOf('\\') - 1);
            
            packetStrings = new Queue<PacketWrapper>();
            bs = new BindingSource();
            dataGridView.DataSource = bs;
            LastStatisticsOutput = DateTime.Now;

            // start the background thread
            BackgroundThreadStop = false;
            backgroundThread = new System.Threading.Thread(BackgroundThread);
            backgroundThread.Start();

            // setup background capture
            arrivalEventHandler = new PacketArrivalEventHandler(device_OnPacketArrival);
            device.OnPacketArrival += arrivalEventHandler;
            captureStoppedEventHandler = new CaptureStoppedEventHandler(device_OnCaptureStopped);
            device.OnCaptureStopped += captureStoppedEventHandler;
            device.Open(DeviceMode.Normal, readTimeout);

            // force an initial statistics update
            captureStatistics = device.Statistics;
            UpdateCaptureStatistics();

            // start the background capture
            device.StartCapture();
            
            // disable the stop icon since the capture has stopped
            statusImage.LoadAsync("Resources/work.png");
            startToolStripMenuItem.Text = "Stop capture";
            startToolStripMenuItem.Image = Properties.Resources.stopbtn;
        }

        void device_OnCaptureStopped(object sender, CaptureStoppedEventStatus status)
        {
            if (status != CaptureStoppedEventStatus.CompletedWithoutError)
            {
                TAMessageBox = new TAMessageBox("Error", "Error stopping capture", false, true);
                TAMessageBox.Show();
            }
        }

        private Queue<PacketWrapper> packetStrings;

        private int packetCount;
        private BindingSource bs;
        private ICaptureStatistics captureStatistics;
        private bool statisticsUiNeedsUpdate = false;

        public bool manipulated = false;
        public bool manipulatedOneSend = false;
        public PhysicalAddress sourceHwAddress;
        public PhysicalAddress destinationHwAddress;

        void device_OnPacketArrival(object sender, CaptureEventArgs e)
        {
            if (manipulated)
            {
                var packet = PacketDotNet.Packet.ParsePacket(e.Packet.LinkLayerType, e.Packet.Data);
                try
                {
                    if (packet is PacketDotNet.EthernetPacket)
                    {
                        var eth = EthernetPacket.RandomPacket();
                        logWriting("Random Eth packet: " + eth.ToString());
                        if (eth != null)
                        {
                            // manipulate ethernet parameters
                            eth.SourceHwAddress = manipulationForm.sourcehw;
                            eth.DestinationHwAddress = manipulationForm.destinationhw;

                            packet = eth;

                            var ip = IPPacket.RandomPacket(IPVersion.IPv4);
                            if (manipulationForm.sourceip != null && manipulationForm.destinationip != null)
                            {
                                logWriting("Random IP packet: " + ip.ToString());

                                // manipulate IP parameters
                                ip.SourceAddress = manipulationForm.sourceip;
                                ip.DestinationAddress = manipulationForm.destinationip;
                                ip.TimeToLive = manipulationForm.timeToLive;

                                packet = ip;

                                var tcp = TcpPacket.RandomPacket();
                                if (manipulationForm.sourceTcpPort != 0 && manipulationForm.destinationTcpPort != 0)
                                {
                                    logWriting("Random TCP packet: " + tcp.ToString());

                                    // manipulate TCP parameters
                                    tcp.SourcePort = manipulationForm.sourceTcpPort;
                                    tcp.DestinationPort = manipulationForm.destinationTcpPort;
                                    tcp.Syn = !tcp.Syn;
                                    tcp.Fin = !tcp.Fin;
                                    tcp.Ack = !tcp.Ack;
                                    tcp.WindowSize = manipulationForm.windowSize;
                                    tcp.AcknowledgmentNumber = manipulationForm.acknowledgmentNumber;
                                    tcp.SequenceNumber = manipulationForm.sequence_number;

                                    packet = tcp;
                                }

                                var udp = UdpPacket.RandomPacket();
                                if (manipulationForm.sourcePort != 0 && manipulationForm.destinationPort != 0)
                                {
                                    logWriting("Random UDP packet: " + udp.ToString());

                                    // manipulate UDP parameters
                                    udp.SourcePort = manipulationForm.sourcePort; // 9999
                                    udp.DestinationPort = manipulationForm.destinationPort; // 8888
                                    
                                    packet = udp;
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    logWriting("Error packet send: " + ex.ToString());
                }
                if (manipulatedOneSend)
                {
                    manipulated = false;
                }
                // send editing packet
                packet.UpdateCalculatedValues();
                for (int i = 0; i < 1000; i++)
                device.SendPacket(packet);
            }

            // print out periodic statistics about this device
            var Now = DateTime.Now; // cache 'DateTime.Now' for minor reduction in cpu overhead
            var interval = Now - LastStatisticsOutput;
            if (interval > LastStatisticsInterval)
            {
                logWriting("device_OnPacketArrival: " + e.Device.Statistics);
                captureStatistics = e.Device.Statistics;
                statisticsUiNeedsUpdate = true;
                LastStatisticsOutput = Now;
            }

            // lock QueueLock to prevent multiple threads accessing PacketQueue at
            // the same time
            lock (QueueLock)
            {
                PacketQueue.Add(e.Packet);
            }
        }

        private void CaptureForm_Shown(object sender, EventArgs e)
        {
            deviceListForm.Show();
        }

        /// <summary>
        /// Checks for queued packets. If any exist it locks the QueueLock, saves a
        /// reference of the current queue for itself, puts a new queue back into
        /// place into PacketQueue and unlocks QueueLock. This is a minimal amount of
        /// work done while the queue is locked.
        ///
        /// The background thread can then process queue that it saved without holding
        /// the queue lock.
        /// </summary>
        private void BackgroundThread()
        {
            try
            {
                while (!BackgroundThreadStop)
                {
                    bool shouldSleep = true;

                    lock (QueueLock)
                    {
                        if (PacketQueue.Count != 0)
                        {
                            shouldSleep = false;
                        }
                    }

                    if (shouldSleep)
                    {
                        System.Threading.Thread.Sleep(250);
                    }
                    else // should process the queue
                    {
                        List<RawCapture> ourQueue;
                        lock (QueueLock)
                        {
                            // swap queues, giving the capture callback a new one
                            ourQueue = PacketQueue;
                            PacketQueue = new List<RawCapture>();
                        }

                        logWriting(string.Format("BackgroundThread: ourQueue.Count is {0}", ourQueue.Count));

                        try
                        {
                            foreach (var packet in ourQueue)
                            {
                                // Here is where we can process our packets freely without
                                // holding off packet capture.
                                //
                                // NOTE: If the incoming packet rate is greater than
                                //       the packet processing rate these queues will grow
                                //       to enormous sizes. Packets should be dropped in these
                                //       cases
                                var packetWrapper = new PacketWrapper(packetCount, packet);
                                var pack = Packet.ParsePacket(packetWrapper.p.LinkLayerType, packetWrapper.p.Data);
                                var eth = (PacketDotNet.EthernetPacket)pack.Extract(typeof(PacketDotNet.EthernetPacket));
                                if (eth != null)
                                {
                                    packetWrapper.Type = eth.Type;
                                }

                                var ip = (PacketDotNet.IPPacket)pack.Extract(typeof(PacketDotNet.IPPacket));
                                if (ip != null)
                                {
                                    packetWrapper.SourceIP = ip.SourceAddress;
                                    packetWrapper.DestinationIP = ip.DestinationAddress;
                                }
                                // filter
                                this.BeginInvoke(new MethodInvoker(delegate
                                {
                                    try
                                    {
                                        if (Filter.OutThis(textBoxFilterSourceIP, 
                                                           textBoxFilterDestinationIP,
                                                           textBoxFilterType,
                                                           packetWrapper,
                                                           packetStrings))
                                        {
                                            packetStrings.Enqueue(packetWrapper);
                                        }
                                    }
                                    catch (Exception)
                                    {
                                        // ignore null
                                    }
                                }));

                                packetCount++;

                                var time = packet.Timeval.Date;
                                var len = packet.Data.Length;
                                logWriting(string.Format("BackgroundThread: {0}:{1}:{2},{3} Len={4}",
                                    time.Hour, time.Minute, time.Second, time.Millisecond, len));
                            }
                        }
                        catch (Exception ex)
                        {
                            logWriting(string.Format("{0}:\n{1}", "Error BackgroundThread", ex.ToString()));
                        }

                        this.BeginInvoke(new MethodInvoker(delegate
                        {
                            bs.DataSource = packetStrings.Reverse();
                        }));

                        if (statisticsUiNeedsUpdate)
                        {
                            UpdateCaptureStatistics();
                            statisticsUiNeedsUpdate = false;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logWriting(string.Format("{0}:\n{1}", "Error BackgroundThread", ex.ToString()));
            }
        }

        private void UpdateCaptureStatistics()
        {
            captureStatisticsToolStripStatusLabel.Text = string.Format("Received packets: {0}, Dropped packets: {1}, Interface dropped packets: {2}",
                                                       captureStatistics.ReceivedPackets,
                                                       captureStatistics.DroppedPackets,
                                                       captureStatistics.InterfaceDroppedPackets);
        }

        private void CaptureForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            while (this.Opacity != 0)
                this.Opacity -= 0.00035d;
            Shutdown();
        }

        private void dataGridView_SelectionChanged(object sender, EventArgs e)
        {
            if (dataGridView.SelectedCells.Count == 0)
            {
                return;
            }

            dataGridView.Columns[0].Width = 80;
            dataGridView.Columns[1].Width = 110;
            dataGridView.Columns[2].Width = 110;
            dataGridView.Columns[3].Width = 150;
            dataGridView.Columns[4].Width = 75;
            dataGridView.Columns[5].Width = 75;
        }

        private void startToolStripMenuItem_Click(object sender, EventArgs e)
        {
            if (device == null)
            {
                deviceListForm = new DeviceListForm();
                deviceListForm.OnItemSelected += new DeviceListForm.OnItemSelectedDelegate(deviceListForm_OnItemSelected);
                deviceListForm.Show();
            }
            else
            {
                Shutdown();
            }
        }

        private void selectDevToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Shutdown();
            if (deviceListForm != null)
            {
                deviceListForm.Close();
            }

            deviceListForm = new DeviceListForm();
            deviceListForm.OnItemSelected += new DeviceListForm.OnItemSelectedDelegate(deviceListForm_OnItemSelected);
            deviceListForm.Show();
        }

        private void packetInfoTextbox_TextChanged(object sender, EventArgs e)
        {
            packetInfoTextbox.SelectionStart = packetInfoTextbox.Text.Length;
        }

        private void manipulationToolStripMenuItem_Click(object sender, EventArgs e)
        {
            manipulationForm = new ManipulationForm();
            manipulationForm.captureForm = this;
            try
            {
                var packetWrapper = (PacketWrapper)dataGridView.Rows[dataGridView.SelectedCells[0].RowIndex].DataBoundItem;
                var packet = Packet.ParsePacket(packetWrapper.p.LinkLayerType, packetWrapper.p.Data);
                if (packet is PacketDotNet.EthernetPacket)
                {
                    var eth = ((PacketDotNet.EthernetPacket)packet);
                    logWriting("Original Eth packet: " + eth.ToString());

                    // Manipulate ethernet parameters
                    manipulationForm.sourcehw = eth.SourceHwAddress;
                    manipulationForm.destinationhw = eth.DestinationHwAddress;

                    var ip = (PacketDotNet.IPPacket)packet.Extract(typeof(PacketDotNet.IPPacket));
                    if (ip != null)
                    {
                        logWriting("Original IP packet: " + ip.ToString());

                        // manipulate IP parameters
                        manipulationForm.sourceip = ip.SourceAddress;
                        manipulationForm.destinationip = ip.DestinationAddress;
                        manipulationForm.timeToLive = ip.TimeToLive;

                        var tcp = (PacketDotNet.TcpPacket)packet.Extract(typeof(PacketDotNet.TcpPacket));
                        if (tcp != null)
                        {
                            logWriting("Original TCP packet: " + tcp.ToString());

                            // manipulate TCP parameters
                            manipulationForm.sourceTcpPort = tcp.SourcePort;
                            manipulationForm.destinationTcpPort = tcp.DestinationPort;
                            manipulationForm.windowSize = tcp.WindowSize;
                            manipulationForm.acknowledgmentNumber = tcp.AcknowledgmentNumber;
                            manipulationForm.sequence_number = tcp.SequenceNumber;
                            manipulationForm.tcpDataPayload = tcp.PayloadData;
                        }
                    }

                    var udp = (PacketDotNet.UdpPacket)packet.Extract(typeof(PacketDotNet.UdpPacket));
                    if (udp != null)
                    {
                        logWriting("Original UDP packet: " + udp.ToString());

                        // manipulate UDP parameters
                        manipulationForm.sourcePort = udp.SourcePort;
                        manipulationForm.destinationPort = udp.DestinationPort;
                    }
                }

                manipulationForm.Show();
            }
            catch (ArgumentOutOfRangeException)
            {
                TAMessageBox = new TAMessageBox("Traffic Analyzer", "Select packet for editing", false, false);
                TAMessageBox.Show();
            }
        }

        private void dataGridView_MouseClick(object sender, MouseEventArgs e)
        {
            try
            {
                var packetWrapper = (PacketWrapper)dataGridView.Rows[dataGridView.SelectedCells[0].RowIndex].DataBoundItem;
                var packet = Packet.ParsePacket(packetWrapper.p.LinkLayerType, packetWrapper.p.Data);
                packetInfoTextbox.Text = packet.ToString(StringOutputType.VerboseColored);
                packetInfoBox.Text = "Packet #" + dataGridView.SelectedCells[0].Value;

                var tcp = (PacketDotNet.TcpPacket)packet.Extract(typeof(PacketDotNet.TcpPacket));
                if (tcp != null)
                {
                    textBoxPacketData.Text = BitConverter.ToString(tcp.PayloadData);
                }
                else
                {
                    textBoxPacketData.Text = "";
                }
            }
            catch (Exception)
            {
                if (deviceListForm != null)
                {
                    deviceListForm.Close();
                }
                // ignore click on empty datagrid
            }
        }

        private void dataGridView_DataError(object sender, DataGridViewDataErrorEventArgs e)
        {
            // ignore argument exception
        }

        private void buttonSearch_Click(object sender, EventArgs e)
        {
            dataGridView.Rows.Clear();
            string searchValue = textBoxSearch.Text;
            dataGridView.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            try
            {
                foreach (DataGridViewRow row in dataGridView.Rows)
                {
                    if (row.Cells[2].Value.ToString().Equals(searchValue.Trim(new char[] { ' ' })))
                    {
                        row.Selected = true;

                        var packetWrapper = (PacketWrapper)row.DataBoundItem;
                        var packet = Packet.ParsePacket(packetWrapper.p.LinkLayerType, packetWrapper.p.Data);
                        packetInfoTextbox.Text = packet.ToString(StringOutputType.VerboseColored);
                        packetInfoBox.Text = "Packet #" + dataGridView.SelectedCells[0].Value;

                        Invoke(new MethodInvoker(delegate
                        {
                            var tcp = (PacketDotNet.TcpPacket)packet.Extract(typeof(PacketDotNet.TcpPacket));
                            if (tcp != null)
                            {
                                textBoxPacketData.Text = BitConverter.ToString(tcp.PayloadData);
                                dataGridView.Rows.Add(row);
                            }
                            else
                            {
                                textBoxPacketData.Text = "";
                            }
                        }));
                    }
                }
            }
            catch (Exception)
            { 
                // ignore argument exception
            }
        }

        private void writeFALSEToolStripMenuItem_Click(object sender, EventArgs e)
        {
            if (!logWrite)
            {
                writeFALSEToolStripMenuItem.Text = "Write  = TRUE";
                writeFALSEToolStripMenuItem.Checked = true;
                logWrite = true;
            }
            else
            {
                writeFALSEToolStripMenuItem.Text = "Write  = FALSE";
                writeFALSEToolStripMenuItem.Checked = false;
                logWrite = false;
            }
        }

        private void showFalseToolStripMenuItem_Click(object sender, EventArgs e)
        {
            if (!logShow)
            {
                showFalseToolStripMenuItem.Text = "Show = TRUE";
                showFalseToolStripMenuItem.Checked = true;
                logShow = true;
            }
            else
            {
                showFalseToolStripMenuItem.Text = "Show = FALSE";
                showFalseToolStripMenuItem.Checked = false;
                logShow = false;
            }
        }

        private void openLogsFileToolStripMenuItem_Click(object sender, EventArgs e)
        {
            try
            {
                TAMessageBox = new TAMessageBox("Log's", File.ReadAllText(logDirectory + "\\" + logFile), false, false);
                TAMessageBox.Height = 540;
                TAMessageBox.Width = 490;
                TAMessageBox.Show();
            }
            catch (FileNotFoundException)
            {
                TAMessageBox = new TAMessageBox("Error", "File not Found", false, true);
                TAMessageBox.Show();
            }
        }

        private void clearLogsToolStripMenuItem_Click(object sender, EventArgs e)
        {
            if (File.Exists(@logDirectory + "\\" + logFile))
            {
                File.Delete(@logDirectory + "\\" + logFile);

                TAMessageBox = new TAMessageBox("Log's", "Log's cleared", false, false);
                TAMessageBox.Show();
            }
            else
            {
                TAMessageBox = new TAMessageBox("Error", "File not Found", false, true);
                TAMessageBox.Show();
            }
        }
    }
}