# Data Deletion Instructions

## How to Delete Your Data

Night Pulse stores all data locally on your device. We do not store any user data on external servers.

### Delete All App Data

To completely remove all Night Pulse data from your device:

1. **Uninstall the App**
   - Press and hold the Night Pulse icon on your home screen
   - Tap "Remove App"
   - Confirm by tapping "Delete App"

This will permanently delete:
- All stored sleep reports
- Gmail authentication tokens
- Telegram bot credentials
- All app settings and preferences

### Delete Specific Data

#### Disconnect Gmail Account
1. Open Night Pulse
2. Go to the Channels tab
3. Under Gmail, tap "Change account"
4. Confirm sign out

This removes your Gmail authentication tokens from the device.

#### Disconnect Telegram
1. Open Night Pulse
2. Go to the Channels tab
3. Disable Telegram
4. The bot token and chat ID will no longer be used

To fully remove the bot token from secure storage, you can disable and re-enable Telegram, then leave the fields empty.

#### Revoke HealthKit Access
1. Open iOS Settings
2. Go to Privacy & Security > Health
3. Find Night Pulse
4. Toggle off all permissions or tap "Delete All Data from Night Pulse"

### Data Stored by Third Parties

#### Google
If you used Gmail integration, Google may retain records of emails sent. To manage this:
1. Visit [Google Account Settings](https://myaccount.google.com)
2. Go to Data & Privacy
3. Review and delete sent emails as needed

You can also revoke Night Pulse's access:
1. Visit [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find Night Pulse
3. Click "Remove Access"

#### Telegram
Messages sent via Telegram remain in the chat history. To delete:
1. Open the relevant Telegram chat
2. Delete messages as needed

### Contact Us

If you have questions about data deletion or need assistance, please open an issue:

[https://github.com/nlevashov/night-pulse/issues](https://github.com/nlevashov/night-pulse/issues)

---

**Note:** Since Night Pulse does not store any data on external servers, there is no server-side data to delete. All data removal is handled locally on your device.
