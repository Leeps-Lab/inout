from otree.api import (
    models, widgets, BaseConstants, BaseSubsession, BaseGroup, BasePlayer,
    Currency as c, currency_range
)

from otree_redwood.models import DecisionGroup
from otree_redwood.utils import DiscreteEventEmitter

import numpy as np
import csv
import math

author = 'Your name here'

doc = """
Your app description
"""

def parse_config(config):
    # parsingmethod for the config files
    with open( 'inout/configs/' +  config) as config_file:
        rows = list(csv.DictReader(config_file))

    # Single round implementation, for more rounds add more rows and
    # traverse them
    configs = []
    for row in rows:
        configs.append({
            'period_length': float(row['period_length']),
            'tick_length': float(row['tick_length']),
            'game_constant': float(row['game_constant']),
            'a_sto': float(row['a_sto']),
            'b_sto': float(row['b_sto']),
            's_sto': float(row['s_sto']),
            'P_sto': float(row['P_sto']),
            'R_sto': float(row['R_sto']),
            'c_sto': float(row['c_sto']),
            'x_0': float(row['x_0']),
            'treatment': row['treatment'],
            'steps_ahead': int(row['steps_ahead']),
            'group_play': True if row['group_play'] == 'TRUE' else False,
            'show_button': True if row['show_button'] == 'TRUE' else False,
        })
    return configs


class Constants(BaseConstants):
    name_in_url = 'inout'
    players_per_group = None
    num_rounds = 100


class Subsession(BaseSubsession):
    pass


class Group(DecisionGroup):
    interval = models.IntegerField(initial=0)
    x_t = models.FloatField(initial=0)

    # Getters for config values
    def period_length(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["period_length"]

    def graph_length(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["period_length"]

    def group_play(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["group_play"]

    def tick_length(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["tick_length"]

    def game_constant(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["game_constant"]

    def a_sto(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["a_sto"]

    def b_sto(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["b_sto"]

    def c_sto(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["c_sto"]

    def s_sto(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["s_sto"]

    def x_0(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["x_0"]

    def P_sto(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["P_sto"]

    def R_sto(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["R_sto"]

    def treatment(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["treatment"]

    def show_button(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["show_button"]

    def steps_ahead(self):
        return parse_config(self.session.config['config_file'])[self.round_number-1]["steps_ahead"]

    def num_rounds(self):
        return len(parse_config(self.session.config['config_file']))

    # oTree Redwood method
    def when_all_players_ready(self):
        super().when_all_players_ready()

        # Needed for first tick logic
        self.x_t = None

        emitter = DiscreteEventEmitter(
            self.tick_length(),
            self.period_length(),
            self,
            self.tick,
            True
        )
        emitter.start()

    # oTree Redwood tick
    def tick(self, current_interval, interval):
        self.refresh_from_db()

        # For a randomly generated initial uncommment the generate below and the comment the other generate
        self.generate_x_t()

        # Message to channel, Include x_t value for treatment
        msg = {}

        for player in self.get_players():
            playerCode = player.participant.code
            p_code = self.group_decisions[playerCode]
            if p_code is 1 or p_code is 0:
                p_code = [p_code, self.game_constant()]
            # print("player code: " + playerCode)
            #print(p_code)
            if p_code[0] is 1:
                # player is in, send stochastic value
                player.update_payoff(self.x_t, p_code[1])
                msg[playerCode] = {
                    'interval': current_interval * self.tick_length(),
                    #'value': self.x_t,
                    'value': player.get_error_pay(),
                    'payoff': player.get_payoff(),
                    'x_t': self.x_t,
                    'decision': 1
                }
            elif p_code[0] is 0:
                # player is out, send constant C
                player.update_payoff(self.game_constant(), -1)
                msg[playerCode] = {
                    'interval': current_interval * self.tick_length(),
                    'value': self.game_constant(),
                    'payoff': player.get_payoff(),
                    'x_t': self.x_t,
                    'decision': 0
                }
            else:
                print("ERROR IN TICK PROCESSING!")

        # Send message across channel
        self.send('tick', msg)



    # Random value generator using formula in spec
    def generate_x_t(self):
        # First tick logic
        if self.x_t is None:
            # Set X_0 to value determined by config
            self.x_t = self.x_0()

            # Always save so database updates user values
            self.save()
            return self.x_t

        # Not first tick so follow forula specification
        if not self.group_play():
            self.x_t = ( (self.a_sto() * self.x_t) + self.generate_noise())

            # b offset value
            self.x_t += self.b_sto()
        else:
            self.x_t = (self.c_sto() + self.a_sto() * (self.forecast_ave() - self.c_sto()) + self.s_sto() * self.generate_noise())

        # round to .2f
        # self.x_t = round(self.x_t, 2)

        # Always save so database updates user values
        self.save()
        return self.x_t

    # Noise generation
    def generate_noise(self):
        # Genrate number on normal distribution using Numpy
        # Mean: 0
        # Std. D: 1
        e_t = np.random.normal(0,1)

        # Multiply by s value (Determined by config)
        return (self.s_sto() * e_t)

    def forecast_ave(self):
        self.refresh_from_db()

        total = 0

        for player in self.get_players():
            playerCode = player.participant.code
            p_code = self.group_decisions[playerCode]
            if p_code == 1 or p_code == 0:
                total += self.game_constant()
            else:
                total += p_code[1]

        return total/len(self.get_players())



class Player(BasePlayer):
    # total payoff
    cumulative_pay = models.FloatField(initial=0)
    # oTree payoff (probably not needed just kept for redundancy)
    # payoff with error
    error_pay = models.FloatField(initial=0)

    # Update both payoff values
    # def update_payoff(self, pay):
    #     self.payoff = self.payoff + pay
    #     self.payoff = round(self.payoff, 2)
    #     self.cumulative_pay = self.cumulative_pay + pay
    #     self.cumulative_pay = math.floor(self.cumulative_pay)
    #
    #     # Always save so database updates user values
    #     self.save()

    def update_payoff(self, pay, forecast):
        # print(forecast)
        if not pay:
            return
        if forecast > -1:
            error = abs(forecast - pay)
            if self.group.group_play():
                converted_pay = max(0, self.group.P_sto() - self.group.R_sto() * (error ** 2))
            else:
                converted_pay = self.group.P_sto() * max(0, 1 - error/self.group.s_sto())
            self.error_pay = converted_pay
            self.error_pay = round(self.error_pay, 2)
            self.payoff = self.payoff + converted_pay
            self.payoff = round(self.payoff, 2)
            self.cumulative_pay = self.cumulative_pay + converted_pay
            self.cumulative_pay = math.floor(self.cumulative_pay)
            # Always save so database updates user values
            self.save()
        else:
            self.payoff = self.payoff + pay
            self.payoff = round(self.payoff, 2)
            self.cumulative_pay = self.cumulative_pay + pay
            self.cumulative_pay = math.floor(self.cumulative_pay)
            # Always save so database updates user values
            self.save()


    # Getter for payoff
    # Note: returniong cumulative payoff since payoff is of type
    #       Curreny(). Causes error with redwood messaging
    def get_payoff(self):
        return self.cumulative_pay

    def get_error_pay(self):
        return self.error_pay

    # Player starts in
    def initial_decision(self):
        return 1
