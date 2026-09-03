import { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    Options
} from 'discord.js';
import 'dotenv/config';

// 1. Initialize the client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 2. Define your commands
const commands = [
    new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Make a suggestion'),
        
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Displays details about this Discord server'),

    new SlashCommandBuilder()
        .setName('suggest-setup')
        .setDescription('Setup the suggestion extention')
        .addChannelOption(option => 
            option.setName('channel')
            .setDescription('Channel of where you want suggestions to be posted')
            .setRequired(true)
        ),


].map(command => command.toJSON());

// 3. Automatically reload commands on startup
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error reloading commands:', error);
    }
});

// 4. Handle command and modal interactions
client.on('interactionCreate', async interaction => {
    const { commandName } = interaction;
     
    if (commandName === 'suggest-setup') {
        const channel = interaction.options.getChannel('channel');

        const suggestSuccess = new EmbedBuilder()
            .setTitle('Setup Successful! 🎉') // Added parentheses and a text string
            .setDescription('The suggestions system has been configured.')
            .setThumbnail(interaction.guild.iconURL({dynamic: true}))
            .addFields(
                {name: 'Suggestion Channel', value: `${channel}`}
            )
            .setColor(0x26de57)
            .setFooter({text: `Setup by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL()})
            

        // Remember to send it back to the channel!
        await interaction.reply({ embeds: [suggestSuccess] });
    }


    // --- STEP A: HANDLE SLASH COMMANDS ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // /suggest Command
        if (commandName === 'suggest') {
            const modal = new ModalBuilder()
                .setCustomId('suggestionModal')
                .setTitle('Submit A Suggestion');

            const titleInput = new TextInputBuilder()
                .setCustomId('suggestionTitle')
                .setLabel('Suggestion Title')
                .setStyle(1) // 1 = Short text
                .setPlaceholder('Whats your suggestion?')
                .setRequired(true);

            const detailsInput = new TextInputBuilder()
                .setCustomId('suggestionDetails')
                .setLabel('Describe your suggestion')
                .setStyle(2) // 2 = Paragraph text
                .setPlaceholder('Provide details on your idea')
                .setRequired(true);

            const firstRow = new ActionRowBuilder().addComponents(titleInput);
            const secondRow = new ActionRowBuilder().addComponents(detailsInput);

            modal.addComponents(firstRow, secondRow);
            await interaction.showModal(modal);
        } 
        
        // /serverinfo Command
        else if (commandName === 'serverinfo') {
            const serverEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(interaction.guild.name)
                .setDescription('Here is some basic information about the server!')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: 'Total Members', value: `${interaction.guild.memberCount}`, inline: true },
                    { name: 'Created On', value: `<t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setImage(interaction.guild.bannerURL() || null)
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [serverEmbed] });
        }
    }

        // --- STEP B: HANDLE MODAL SUBMISSIONS ---
    else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'suggestionModal') {
            try {
                // 1. REPLACE THIS STRING WITH YOUR ACTUAL CHANNEL ID
                const TARGET_CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE';

                const title = interaction.fields.getTextInputValue('suggestionTitle');
                const details = interaction.fields.getTextInputValue('suggestionDetails');

                // Build the embed
                const submittionEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle(`💡 New Suggestion: ${title}`)
                    .setDescription('If you like this suggestion bump it up by requesting it again!')
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .addFields(
                        { name: 'Details', value: `${details}`, inline: true }
                    )
                    .setFooter({ text: `Submitted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                // Fetch the target channel from the server cache/API
                const targetChannel = await interaction.guild.channels.fetch(TARGET_CHANNEL_ID);

                if (!targetChannel) {
                    throw new Error('Target channel not found. Check your channel ID!');
                }

                // Send the rich embed directly into the log channel
                await targetChannel.send({ embeds: [submittionEmbed] });

                // Reply to the user privately (ephemeral ensures nobody else sees this pop-up)
                await interaction.reply({
                    content: 'Thanks for the suggestion! It has been posted to the suggestions channel.',
                    ephemeral: true
                });

            } catch (error) {
                console.error('Error processing modal submission:', error);
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error saving your suggestion.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error saving your suggestion.', ephemeral: true });
                }
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
