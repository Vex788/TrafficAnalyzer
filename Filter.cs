using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MetroFramework.Controls;

namespace SNMPTrafficAnalyzer
{
    class Filter
    {
        public static bool OutThis(MetroTextBox textBoxFilterSourceIP,
                                   MetroTextBox textBoxFilterDestinationIP,
                                   MetroTextBox textBoxFilterType,
                                   CaptureForm.PacketWrapper packetWrapper,
                                   Queue<CaptureForm.PacketWrapper> packetStrings)
        {
            bool answer = false;

            textBoxFilterSourceIP.Text.Trim(new char[] { ' ' });
            textBoxFilterDestinationIP.Text.Trim(new char[] { ' ' });
            textBoxFilterType.Text.Trim(new char[] { ' ' });

            if (!string.IsNullOrEmpty(textBoxFilterSourceIP.Text) &&
                string.IsNullOrEmpty(textBoxFilterDestinationIP.Text) &&
                string.IsNullOrEmpty(textBoxFilterType.Text))
            {
                if (packetWrapper.SourceIP.ToString().Contains(textBoxFilterSourceIP.Text))
                {
                    answer = true;
                }
            }
            if (!string.IsNullOrEmpty(textBoxFilterSourceIP.Text) &&
                !string.IsNullOrEmpty(textBoxFilterDestinationIP.Text) &&
                string.IsNullOrEmpty(textBoxFilterType.Text))
            {
                if (packetWrapper.SourceIP.ToString().Contains(textBoxFilterSourceIP.Text) &&
                    packetWrapper.DestinationIP.ToString().Contains(textBoxFilterDestinationIP.Text))
                {
                    answer = true;
                }
            }
            if (!string.IsNullOrEmpty(textBoxFilterSourceIP.Text) &&
                !string.IsNullOrEmpty(textBoxFilterDestinationIP.Text) &&
                !string.IsNullOrEmpty(textBoxFilterType.Text))
            {
                if (packetWrapper.SourceIP.ToString().Contains(textBoxFilterSourceIP.Text) &&
                    packetWrapper.DestinationIP.ToString().Contains(textBoxFilterDestinationIP.Text) &&
                    packetWrapper.Type.ToString().ToLower().Contains(textBoxFilterType.Text.ToLower()))
                {
                    answer = true;
                }
            }
            if (!string.IsNullOrEmpty(textBoxFilterSourceIP.Text) &&
                string.IsNullOrEmpty(textBoxFilterDestinationIP.Text) &&
                !string.IsNullOrEmpty(textBoxFilterType.Text))
            {
                if (packetWrapper.SourceIP.ToString().Contains(textBoxFilterSourceIP.Text) &&
                    packetWrapper.Type.ToString().ToLower().Contains(textBoxFilterType.Text.ToLower()))
                {
                    answer = true;
                }
            }
            if (string.IsNullOrEmpty(textBoxFilterSourceIP.Text) &&
                !string.IsNullOrEmpty(textBoxFilterDestinationIP.Text) &&
                !string.IsNullOrEmpty(textBoxFilterType.Text))
            {
                if (packetWrapper.DestinationIP.ToString().Contains(textBoxFilterDestinationIP.Text) &&
                    packetWrapper.Type.ToString().ToLower().Contains(textBoxFilterType.Text.ToLower()))
                {
                    answer = true;
                }
            }
            if (string.IsNullOrEmpty(textBoxFilterSourceIP.Text) &&
                !string.IsNullOrEmpty(textBoxFilterDestinationIP.Text) &&
                string.IsNullOrEmpty(textBoxFilterType.Text))
            {
                if (packetWrapper.DestinationIP.ToString().Contains(textBoxFilterDestinationIP.Text))
                {
                    answer = true;
                }
            }
            if (string.IsNullOrEmpty(textBoxFilterSourceIP.Text) &&
                string.IsNullOrEmpty(textBoxFilterDestinationIP.Text) &&
                !string.IsNullOrEmpty(textBoxFilterType.Text))
            {
                if (packetWrapper.Type.ToString().ToLower().Contains(textBoxFilterType.Text.ToLower()))
                {
                    answer = true;
                }
            }
            if (string.IsNullOrEmpty(textBoxFilterSourceIP.Text) &&
                string.IsNullOrEmpty(textBoxFilterDestinationIP.Text) &&
                string.IsNullOrEmpty(textBoxFilterType.Text))
            {
                answer = true;
            }
            
            return answer;
        }
    }
}
