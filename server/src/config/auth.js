import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const auth = {
    gmail: {
        driver: 'gmail',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    },
    facebook: {
        driver: 'facebook',
        client_id: process.env.FACEBOOK_CLIENT_ID,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
    },
    instagram: {
        driver: 'instagram',
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
    },
    jira: {
        driver: "jira",
        email: process.env.JIRA_EMAIL,
        api_token: process.env.JIRA_API_TOKEN,
        base_url: process.env.JIRA_BASE_URL,
    },
    sheets: {
        driver: 'sheets',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        service_account_key: path.join(process.cwd(), 'server/config/google-service-account.json')
    },
    drive: {
        driver: 'drive',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI
    }
}

export default auth;
