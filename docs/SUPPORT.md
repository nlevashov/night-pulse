# Night Pulse Support

## Frequently Asked Questions

### General

**Q: What is Night Pulse?**
A: Night Pulse is an iOS app that tracks your heart rate during sleep using Apple HealthKit and generates daily reports that can be shared with your coach or healthcare provider.

**Q: Is Night Pulse free?**
A: Yes, Night Pulse is free to use.

**Q: Does Night Pulse work on Android?**
A: Currently, Night Pulse is only available for iOS devices with Apple HealthKit support.

---

### Setup

**Q: Why does Night Pulse need access to my Health data?**
A: Night Pulse reads your sleep stages and heart rate data to generate sleep reports. This data is processed entirely on your device and is never uploaded to external servers.

**Q: How do I grant HealthKit permissions?**
A: When you first open the app, you'll be prompted to allow access. You can also manage permissions in iOS Settings > Privacy & Security > Health > Night Pulse.

---

### Gmail Integration

**Q: How do I set up Gmail delivery?**
A:
1. Go to the Channels tab
2. Enable Gmail
3. Tap "Sign in with Google"
4. Enter recipient email addresses
5. Use "Test Connection" to verify

**Q: Why do I need to sign in with Google?**
A: Night Pulse sends emails from your own Gmail account. This ensures recipients know the email is from you, not from an unknown sender.

**Q: Is my Gmail password stored?**
A: No. Night Pulse uses OAuth 2.0, which means we never see or store your password. We only receive a token that allows sending emails on your behalf.

---

### Telegram Integration

**Q: How do I set up Telegram delivery?**
A:
1. Create a bot via @BotFather on Telegram
2. Get your chat ID via @userinfobot
3. Enter the bot token and chat ID in the Channels tab
4. Use "Test Connection" to verify

**Q: Can I send reports to a group?**
A: Yes, create a group with your bot and the recipients, then use the group's chat ID.

---

### Troubleshooting

**Q: I'm not receiving notifications**
A:
1. Check that notifications are enabled in iOS Settings
2. Ensure the Manual Reminder is enabled in the Channels tab
3. Verify the reminder time is set correctly

**Q: My report shows no data**
A:
1. Make sure you wore your Apple Watch during sleep
2. Check that sleep tracking is enabled on your Apple Watch
3. Verify HealthKit permissions are granted

**Q: Gmail test failed**
A:
1. Try signing out and signing in again
2. Check your internet connection
3. Verify the recipient email address is correct

**Q: Telegram test failed**
A:
1. Verify your bot token is correct
2. Ensure the chat ID is correct (negative for groups)
3. Make sure the bot is added to the chat/group

---

### Data & Privacy

**Q: Where is my data stored?**
A: All data is stored locally on your device. We do not operate any servers.

**Q: How do I delete my data?**
A: Uninstalling the app removes all stored data. You can also disconnect Gmail/Telegram accounts in the Channels tab.

**Q: Do you share my data?**
A: No. Your data is only shared with recipients you explicitly configure.

---

## Contact Support

If you need further assistance, please contact us:

**Email:** [your-email@example.com]

**GitHub Issues:** [https://github.com/your-username/night-pulse/issues](https://github.com/your-username/night-pulse/issues)

We typically respond within 48 hours.

---

## Report a Bug

Found a bug? Please report it on our GitHub repository with:
- Device model and iOS version
- Steps to reproduce the issue
- Screenshots if applicable

[Report a Bug](https://github.com/your-username/night-pulse/issues/new)
