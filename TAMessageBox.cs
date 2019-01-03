using MetroFramework.Forms;
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
    public partial class TAMessageBox : MetroForm
    {
        public static bool buttonOkListener = false;

        public TAMessageBox(string headerText, string messageText, bool okNeed, bool error)
        {
            InitializeComponent();

            this.Text = headerText;
            this.MessageTextBox.Text = messageText;

            if (!okNeed) { OkButton.Hide(); }
            if (error)
            {
                Style = MetroFramework.MetroColorStyle.Red;
                MessageTextBox.Style = MetroFramework.MetroColorStyle.Red;
            }

            Opacity = 0;
            Timer timer = new Timer();
            timer.Tick += new EventHandler((sender, e) =>
            {
                if ((Opacity += 0.1d) == 1) timer.Stop();
            });
            timer.Interval = 1;
            timer.Start();
        }

        private void OkButton_Click(object sender, EventArgs e)
        {
            buttonOkListener = true;
            Close();
        }

        private void CloseButton_Click(object sender, EventArgs e)
        {
            buttonOkListener = false;
            Close();
        }

        private void TAMessageBox_FormClosing(object sender, FormClosingEventArgs e)
        {
            while (this.Opacity != 0)
                this.Opacity -= 0.00035d;
        }
    }
}
